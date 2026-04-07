#include <Arduino.h>
#include <SoftwareSerial.h>

/* -------------------- MODO DE DIAGNÓSTICO RAW UART -------------------- */
#define TOUCH_PIN 14            // D5 (GPIO14) -> Interrupção/Detecção de toque
#define PIN_FINGER_RX 5         // D1 -> TX do sensor
#define PIN_FINGER_TX 4         // D2 -> RX do sensor

SoftwareSerial fingerSerial(PIN_FINGER_RX, PIN_FINGER_TX);

// Pacote RAW do comando "VerifyPassword" (Senha 0x00000000)
// Formato: Header(2)+Addr(4)+PID(1)+Len(2)+Instruction(1)+Params(4)+Checksum(2)
const uint8_t cmdVerify[] = {0xEF, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0x01, 0x00, 0x07, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1B};

int baudRates[] = {9600, 19200, 38400, 57600, 115200};
int currentBaudIndex = 0;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  pinMode(TOUCH_PIN, INPUT);

  Serial.println("\n\n=============================================");
  Serial.println("=== DIAGNÓSTICO PROFUNDO DO SENSOR ZW-111 ===");
  Serial.println("=============================================");
  Serial.println("-> TouchOut (D5): OK! Detectado com sucesso.");
  Serial.println("-> Buscando resposta do sensor em todos os Boud Rates...");
  Serial.println("=============================================\n");
}

void loop() {
  // Envia o comando varrendo todas as velocidades
  if (millis() - lastSend > 3000) {
    lastSend = millis();
    
    // Configura a serial para a velocidade atual e aguarda estabilizar
    fingerSerial.begin(baudRates[currentBaudIndex]);
    delay(50);
    
    Serial.printf("[TESTE BAUD %d] Enviando...", baudRates[currentBaudIndex]);
    fingerSerial.write(cmdVerify, sizeof(cmdVerify));
    
    // Aguarda até 1,5 segundos por uma resposta
    unsigned long waitStart = millis();
    bool gotReply = false;
    
    while (millis() - waitStart < 1500) {
      if (fingerSerial.available()) {
        if (!gotReply) {
          Serial.print(" -> [RESPOSTA]: ");
          gotReply = true;
        }
        uint8_t c = fingerSerial.read();
        if (c < 0x10) Serial.print("0");
        Serial.print(c, HEX);
        Serial.print(" ");
        delay(2);
      }
    }
    
    if (!gotReply) {
      Serial.print(" -> (Sem resposta)");
    }
    Serial.println();

    // Passa para o próximo baud rate para o próximo teste
    currentBaudIndex++;
    if (currentBaudIndex >= 5) currentBaudIndex = 0;
  }

  // Verifica o sensor capacitivo de toque (TouchOut)
  static bool lastTouch = false;
  bool currentTouch = (digitalRead(TOUCH_PIN) == HIGH);
  if (currentTouch != lastTouch) {
    lastTouch = currentTouch;
    if (currentTouch) {
      Serial.println("👉 [HARDWARE] Dedo ENCOSTADO no sensor (TouchOut ALTO)");
    } else {
      Serial.println("👆 [HARDWARE] Dedo REMOVIDO (TouchOut BAIXO)");
    }
  }
}