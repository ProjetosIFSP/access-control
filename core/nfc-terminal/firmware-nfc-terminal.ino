// =============================================================================
// firmware-nfc-terminal.ino  — v3.0 (uid-only)
// Terminal de Leitura RFID — NodeMCU v3 (ESP8266) + RC522 via SPI
//
// Fluxo de acesso (modo normal):
//   1. Cartão aproximado → firmware lê o UID (número de série)
//   2. Publica access-attempt com UID + deviceSecret
//   3. Recebe access-result → abre a porta (GRANTED) ou nega
//
// Fluxo de pareamento (modo pareamento):
//   1. Cartão aproximado → firmware lê o UID
//   2. Publica access-attempt com UID + deviceSecret
//   3. Servidor vincula a tag ao usuário usando o UID como chave
//   4. Recebe access-result → sinaliza conclusão (LED)
//
// O vínculo tag ↔ usuário é feito exclusivamente pelo número de série (UID)
// da tag ou cartão, sem escrita de dados nos blocos MIFARE. (Verificar depois )
//
// Pinout RC522 (NodeMCU v3):
//   SDA (SS) → D8 (GPIO15)   SCK → D5 (GPIO14)
//   MOSI     → D7 (GPIO13)   MISO → D6 (GPIO12)
//   RST      → D3 (GPIO0)    VCC → 3V3   GND → GND
// =============================================================================

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// ── CONFIGURAR ANTES DE USAR ──────────────────────────────────────────────────

const char* WIFI_SSID     = "Miguel";
const char* WIFI_PASSWORD = "Mmh020516";
const char* MQTT_SERVER   = "192.168.0.121";
const int   MQTT_PORT     = 1883;

// ── SEGURANÇA ─────────────────────────────────────────────────────────────────
// Deve corresponder a IOT_DEVICE_SECRET no .env do servidor.
const char* DEVICE_SECRET = "Zx9kPq2mRn7vWj4tYb8cLe";

// Se ROOM_ID estiver vazio → modo pareamento (enrollment). Preencha para modo acesso.
const char* ROOM_ID = "";

// Ativar logs no Serial Monitor (comentar em produção)
#define DEBUG

// ── Pinos e constantes ────────────────────────────────────────────────────────

#define PIN_RFID_SS  15   // D8
#define PIN_RFID_RST 0    // D3
#define PIN_LED      LED_BUILTIN

const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
const unsigned long ACCESS_RESULT_TIMEOUT = 5000;   // espera result do servidor
const unsigned long TAG_DEBOUNCE_MS       = 3000;   // ignora mesma tag por 3s
const int WIFI_MAX_ATTEMPTS = 20;
const int MQTT_MAX_ATTEMPTS = 5;

// ── Variáveis de estado ───────────────────────────────────────────────────────

char controllerId[48];

String topicHeartbeat;
String topicAccessAttempt;
String topicAccessResult;

enum State { IDLE, WAITING_RESULT };
State currentState = IDLE;

unsigned long lastHeartbeat   = 0;
unsigned long waitingResultAt = 0;

String lastTagUid  = "";
unsigned long lastTagTime = 0;

String pendingTagUid = "";

bool   resultReceived = false;
String resultStatus   = "";

// ── Instâncias ────────────────────────────────────────────────────────────────

WiFiClient   espClient;
PubSubClient mqtt(espClient);
MFRC522      rfid(PIN_RFID_SS, PIN_RFID_RST);

// =============================================================================
//  CONECTIVIDADE
// =============================================================================

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int a = 0;
  while (WiFi.status() != WL_CONNECTED && a++ < WIFI_MAX_ATTEMPTS) {
    delay(500);
#ifdef DEBUG
    Serial.print(F("."));
#endif
  }
#ifdef DEBUG
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("[WiFi] IP: ")); Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("[WiFi] Falha ao conectar."));
  }
#endif
}

void connectMqtt() {
  if (WiFi.status() != WL_CONNECTED) { connectWifi(); return; }
  String clientId = String("nfc-") + controllerId;
  int a = 0;
  while (!mqtt.connected() && a++ < MQTT_MAX_ATTEMPTS) {
    mqtt.connect(clientId.c_str());
    if (!mqtt.connected()) delay(2000);
  }
  if (!mqtt.connected()) return;
  mqtt.subscribe(topicAccessResult.c_str());
  publishRegister();
#ifdef DEBUG
  Serial.println(F("[MQTT] Conectado."));
#endif
}

// =============================================================================
//  PUBLICAÇÕES MQTT
// =============================================================================

void publishRegister() {
  StaticJsonDocument<192> doc;
  doc["controllerId"]    = controllerId;
  doc["firmwareVersion"] = "3.0.0-uid-only";
  doc["sensorModel"]     = "RC522";
  doc["pairingMode"]     = (ROOM_ID[0] == '\0');
  if (ROOM_ID[0] != '\0') doc["roomId"] = ROOM_ID;
  String p; serializeJson(doc, p);
  String t = String("door/") + controllerId + "/register";
  mqtt.publish(t.c_str(), p.c_str(), true);
}

void sendHeartbeat() {
  StaticJsonDocument<96> doc;
  doc["controllerId"] = controllerId;
  String p; serializeJson(doc, p);
  mqtt.publish(topicHeartbeat.c_str(), p.c_str());
}

// Publica access-attempt com UID + deviceSecret
void publishAccessAttempt(const String& uid) {
  StaticJsonDocument<256> doc;
  doc["credentialType"]  = "NFC_TAG";
  doc["credentialValue"] = uid;
  doc["deviceSecret"]    = DEVICE_SECRET;

  String p; serializeJson(doc, p);
  mqtt.publish(topicAccessAttempt.c_str(), p.c_str());

#ifdef DEBUG
  Serial.print(F("[RFID] Access-attempt → UID: ")); Serial.println(uid);
#endif
}

// =============================================================================
//  CALLBACK MQTT
// =============================================================================

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != topicAccessResult) return;

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload, length)) return;

  const char* status = doc["status"];
  if (!status) return;

  resultStatus   = String(status);
  resultReceived = true;

#ifdef DEBUG
  Serial.print(F("[MQTT] Result: ")); Serial.println(resultStatus);
#endif
}

// =============================================================================
//  FEEDBACK VISUAL
// =============================================================================

void ledOn()  { digitalWrite(PIN_LED, LOW); }
void ledOff() { digitalWrite(PIN_LED, HIGH); }

void ledBlink(int times, unsigned long ms) {
  for (int i = 0; i < times; i++) { ledOn(); delay(ms); ledOff(); delay(ms); }
}

// =============================================================================
//  SETUP
// =============================================================================

void setup() {
#ifdef DEBUG
  Serial.begin(115200);
  delay(100);
  Serial.println(F("\n=== Terminal RFID IFSP-PEP v3.0 (uid-only) ==="));
#endif

  pinMode(PIN_LED, OUTPUT);
  ledOff();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);  // inicia cedo para ganhar tempo
  delay(100);

  // Controller ID baseado no MAC
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  mac.toUpperCase();
  snprintf(controllerId, sizeof(controllerId), "esp8266-%s", mac.c_str());

#ifdef DEBUG
  Serial.print(F("Controller ID: ")); Serial.println(controllerId);
  Serial.print(F("Modo: ")); Serial.println(ROOM_ID[0] ? "ACESSO" : "PAREAMENTO");
#endif

  topicHeartbeat     = String("door/") + controllerId + "/heartbeat";
  topicAccessAttempt = String("door/") + controllerId + "/access-attempt";
  topicAccessResult  = String("door/") + controllerId + "/access-result";

  SPI.begin();
  rfid.PCD_Init();
  delay(4);

#ifdef DEBUG
  byte v = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.print(F("[RFID] RC522 v")); Serial.println(v, HEX);
  if (v == 0x00 || v == 0xFF) Serial.println(F("[RFID] ALERTA: RC522 sem resposta!"));
#endif

  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);

  connectWifi();
  connectMqtt();
  ledBlink(2, 150);

#ifdef DEBUG
  Serial.println(F("[Sistema] Pronto."));
#endif
}

// =============================================================================
//  LOOP
// =============================================================================

void loop() {
  unsigned long now = millis();

  // Reconexão
  if (WiFi.status() != WL_CONNECTED) { connectWifi(); return; }
  if (!mqtt.connected()) { connectMqtt(); return; }
  mqtt.loop();

  // Heartbeat
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = now;
  }

  switch (currentState) {

    // ── IDLE: aguarda tag ──────────────────────────────────────────────────────
    case IDLE: {
      if (!rfid.PICC_IsNewCardPresent()) break;
      if (!rfid.PICC_ReadCardSerial())   break;

      // Montar UID como string hex "AA:BB:CC:DD"
      String uid = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (i) uid += ":";
        if (rfid.uid.uidByte[i] < 0x10) uid += "0";
        uid += String(rfid.uid.uidByte[i], HEX);
      }
      uid.toUpperCase();

      // Debounce: ignora a mesma tag por TAG_DEBOUNCE_MS
      if (uid == lastTagUid && (now - lastTagTime) < TAG_DEBOUNCE_MS) {
        rfid.PICC_HaltA();
        rfid.PCD_StopCrypto1();
        break;
      }

#ifdef DEBUG
      Serial.print(F("[RFID] Tag: ")); Serial.println(uid);
#endif
      lastTagUid  = uid;
      lastTagTime = now;
      pendingTagUid = uid;

      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();

      ledBlink(1, 80);

      publishAccessAttempt(uid);
      resultReceived = false;
      resultStatus   = "";
      waitingResultAt = now;
      currentState    = WAITING_RESULT;
      break;
    }

    // ── WAITING_RESULT: aguarda access-result do servidor ─────────────────────
    case WAITING_RESULT: {
      if (!resultReceived) {
        if (now - waitingResultAt >= ACCESS_RESULT_TIMEOUT) {
#ifdef DEBUG
          Serial.println(F("[Acesso] Timeout — sem resposta."));
#endif
          ledBlink(3, 200);
          currentState = IDLE;
        }
        break;
      }

      bool granted = (resultStatus == "GRANTED");

      if (granted) {
        // Modo ACESSO: abre a porta
        // Modo PAREAMENTO: sinaliza que o vínculo foi concluído (GRANTED retornado pelo servidor)
        ledOn(); delay(1500); ledOff();
      } else {
        ledBlink(4, 60);
      }

#ifdef DEBUG
      Serial.print(F("[Acesso] ")); Serial.print(pendingTagUid);
      Serial.print(F(" → ")); Serial.println(granted ? F("LIBERADO") : F("NEGADO"));
#endif

      pendingTagUid = "";
      currentState  = IDLE;
      break;
    }
  }
}
