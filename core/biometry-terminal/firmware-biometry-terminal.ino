// =============================================================================
// firmware-biometry-terminal.ino  — v1.0
// Terminal de Leitura Biométrica — NodeMCU v3 (ESP8266) + Sensor ZW-111 (UART)
//
// Fluxo de acesso:
//   1. TouchOut detecta dedo -> "Acorda" para leitura biométrica
//   2. Sensor captura impressão digital e busca ID (ou extrai template)
//   3. Publica access-attempt via MQTT
//   4. Recebe access-result → sinaliza conclusão (LED do anel e LED_BUILTIN)
//
// Pinout ZW-111 (Interface 6pin 1.0mm) -> NodeMCU v3:
//   PIN1: V_Touch (3.3V) -> 3V3
//   PIN2: TouchOut      -> D5 (GPIO14)  [Mudado de D4 para evitar erro de boot]
//   PIN3: VCC (3.3V)    -> 3V3
//   PIN4: TX            -> D1 (GPIO5)   [RX do SoftwareSerial]
//   PIN5: RX            -> D2 (GPIO4)   [TX do SoftwareSerial]
//   PIN6: GND           -> GND
// =============================================================================

#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <Adafruit_Fingerprint.h> // Recomendado para sensores genéricos UART (AS608, ZW-111 etc.)

// ── CONFIGURAÇÕES PADRÃO ────────────────
char WIFI_SSID[32]     = "Miguel";
char WIFI_PASSWORD[64] = "Mmh020516";
char MQTT_SERVER[40]   = "192.168.0.121";
char MQTT_PORT[6]      = "1883";
char DEVICE_SECRET[40] = "Zx9kPq2mRn7vWj4tYb8cLe";

bool shouldSaveConfig = false;

void saveConfigCallback () {
  Serial.println("[Wi-Fi] Configuração alterada, salvando...");
  shouldSaveConfig = true;
}

#define DEBUG

// ── Pinos e constantes ────────────────────────────────────────────────────────

#define PIN_FINGER_RX 5  // D1 -> TX do sensor
#define PIN_FINGER_TX 4  // D2 -> RX do sensor
#define PIN_TOUCHOUT  14 // D5 (GPIO14) -> Interrupção/Detecção de toque 
#define PIN_LED       LED_BUILTIN

const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
const unsigned long ACCESS_RESULT_TIMEOUT = 5000;
const unsigned long FINGER_DEBOUNCE_MS    = 3000;

// ── Variáveis de estado ───────────────────────────────────────────────────────

char controllerId[48];

String topicHeartbeat;
String topicAccessAttempt;
String topicAccessResult;
String topicStatus;

enum State { IDLE, WAITING_RESULT };
State currentState = IDLE;

enum DoorState { OPEN, LOCKED, UNKNOWN };
DoorState currentDoorState = UNKNOWN;

unsigned long lastHeartbeat   = 0;
unsigned long waitingResultAt = 0;
unsigned long lastFingerTime  = 0;

bool   resultReceived = false;
String resultStatus   = "";

// ── Instâncias ────────────────────────────────────────────────────────────────

WiFiClient espClient;
PubSubClient mqtt(espClient);
SoftwareSerial fingerSerial(PIN_FINGER_RX, PIN_FINGER_TX);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

// =============================================================================
//  SETUP & REDE
// =============================================================================

void connectWifi() {
  if (!LittleFS.begin()) {
#ifdef DEBUG
    Serial.println("[LittleFS] Falha ao montar, formatando...");
#endif
    LittleFS.format();
    LittleFS.begin();
  }

  if (LittleFS.exists("/config.json")) {
    File configFile = LittleFS.open("/config.json", "r");
    if (configFile) {
      size_t size = configFile.size();
      std::unique_ptr<char[]> buf(new char[size]);
      configFile.readBytes(buf.get(), size);
      StaticJsonDocument<200> doc;
      auto error = deserializeJson(doc, buf.get());
      if (!error) {
        strcpy(MQTT_SERVER, doc["mqtt_server"] | "192.168.0.121");
        strcpy(MQTT_PORT, doc["mqtt_port"] | "1883");
        strcpy(DEVICE_SECRET, doc["device_secret"] | "Zx9kPq2mRn7vWj4tYb8cLe");
      }
    }
  }

  WiFiManagerParameter custom_mqtt_server("server", "IP MQTT", MQTT_SERVER, 40);
  WiFiManagerParameter custom_mqtt_port("port", "Porta MQTT", MQTT_PORT, 6);
  WiFiManagerParameter custom_device_secret("secret", "Secret Device", DEVICE_SECRET, 40);

  WiFiManager wifiManager;
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  wifiManager.setConfigPortalTimeout(180);
  
  wifiManager.addParameter(&custom_mqtt_server);
  wifiManager.addParameter(&custom_mqtt_port);
  wifiManager.addParameter(&custom_device_secret);

  if (WiFi.SSID() == "") {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }

  if (!wifiManager.autoConnect("access-control-setup-bio", "admin123")) {
    Serial.println("[Wi-Fi] Falha ao conectar, reiniciando...");
    delay(3000);
    ESP.restart();
  }

  strcpy(MQTT_SERVER, custom_mqtt_server.getValue());
  strcpy(MQTT_PORT, custom_mqtt_port.getValue());
  strcpy(DEVICE_SECRET, custom_device_secret.getValue());

  if (shouldSaveConfig) {
    StaticJsonDocument<200> doc;
    doc["mqtt_server"] = MQTT_SERVER;
    doc["mqtt_port"] = MQTT_PORT;
    doc["device_secret"] = DEVICE_SECRET;

    File configFile = LittleFS.open("/config.json", "w");
    if (configFile) {
      serializeJson(doc, configFile);
      configFile.close();
    }
    shouldSaveConfig = false;
    mqtt.setServer(MQTT_SERVER, atoi(MQTT_PORT));
  }

#ifdef DEBUG
  Serial.print(F("[WiFi] Conectado IP: "));
  Serial.println(WiFi.localIP());
#endif
}

unsigned long lastMqttAttempt = 0;

void connectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - lastMqttAttempt < 5000) return;
  lastMqttAttempt = millis();
  
  String clientId = String("bio-") + controllerId;
  
  if (mqtt.connect(clientId.c_str())) {
    mqtt.subscribe(topicAccessResult.c_str());
    publishRegister();
    lastHeartbeat = millis() - HEARTBEAT_INTERVAL_MS;
#ifdef DEBUG
    Serial.println(F("[MQTT] Conectado e configurado."));
#endif
  }
}

// =============================================================================
//  PUBLICAÇÕES MQTT
// =============================================================================

void publishRegister() {
  StaticJsonDocument<192> doc;
  doc["controllerId"]    = controllerId;
  doc["firmwareVersion"] = "1.0.0-bio";
  doc["sensorModel"]     = "ZW-111";
  
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

void publishAccessAttempt(int fingerID) {
  StaticJsonDocument<256> doc;
  doc["credentialType"]  = "BIOMETRICS";
  doc["credentialValue"] = String(fingerID);
  doc["deviceSecret"]    = DEVICE_SECRET;

  String p; serializeJson(doc, p);
  mqtt.publish(topicAccessAttempt.c_str(), p.c_str());

#ifdef DEBUG
  Serial.print(F("[BIO] Access-attempt -> ID: ")); Serial.println(fingerID);
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
//  HARDWARE & FEEDBACK
// =============================================================================

void ledOn()  { digitalWrite(PIN_LED, LOW); }
void ledOff() { digitalWrite(PIN_LED, HIGH); }

void ledBlink(int times, unsigned long ms) {
  for (int i = 0; i < times; i++) { ledOn(); delay(ms); ledOff(); delay(ms); }
}

void setupFingerprint() {
  // O sensor normalmente usa 57600 baud rate por padrão
  finger.begin(57600);
  delay(100);
  if (finger.verifyPassword()) {
#ifdef DEBUG
    Serial.println("[BIO] Sensor biométrico encontrado!");
#endif
  } else {
#ifdef DEBUG
    Serial.println("[BIO] Não foi possível encontrar o sensor biométrico.");
#endif
  }
}

// Tenta realizar uma leitura (modo simples)
int getFingerprintID() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK)  return -1;

  // Retorna ID se deu match
  return finger.fingerID;
}

// =============================================================================
//  SETUP
// =============================================================================

void setup() {
#ifdef DEBUG
  Serial.begin(115200);
  delay(100);
  Serial.println(F("\n=== Terminal Biométrico IFSP-PEP v1.0 ==="));
#endif

  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_TOUCHOUT, INPUT);
  ledOff();

  String mac = WiFi.macAddress();
  mac.replace(":", "");
  mac.toUpperCase();
  snprintf(controllerId, sizeof(controllerId), "esp8266-bio-%s", mac.c_str());

  topicHeartbeat     = String("door/") + controllerId + "/heartbeat";
  topicAccessAttempt = String("door/") + controllerId + "/access-attempt";
  topicAccessResult  = String("door/") + controllerId + "/access-result";
  topicStatus        = String("door/") + controllerId + "/status";

#ifdef DEBUG
  Serial.print(F("Controller ID: ")); Serial.println(controllerId);
  Serial.println(F("Inicializando..."));
#endif

  connectWifi();
  mqtt.setServer(MQTT_SERVER, atoi(MQTT_PORT));
  mqtt.setCallback(onMqttMessage);
  
  setupFingerprint();
}

// =============================================================================
//  LOOP
// =============================================================================

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      connectMqtt();
    } else {
      mqtt.loop();
    }
  }

  if (mqtt.connected() && (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS)) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  // --- Lógica de pareamento / Leitura ---
  
  // Exemplo de uso com PIN_TOUCHOUT (pino em HIGH quando o dedo é encostado):
  // Aqui você pode melhorar para acionar a leitura apenas quando PIN_TOUCHOUT == HIGH.
  bool touched = digitalRead(PIN_TOUCHOUT) == HIGH;
  
  // Por ora, vamos apenas checar IDLE state
  if (currentState == IDLE && touched) {
    if (millis() - lastFingerTime > FINGER_DEBOUNCE_MS) {
      int id = getFingerprintID();
      if (id >= 0) {
        publishAccessAttempt(id);
        currentState = WAITING_RESULT;
        waitingResultAt = millis();
        lastFingerTime = millis();
      }
    }
  }

  if (currentState == WAITING_RESULT) {
    // Timeout
    if (millis() - waitingResultAt > ACCESS_RESULT_TIMEOUT) {
#ifdef DEBUG
      Serial.println(F("[BIO] Timeout aguardando access-result"));
#endif
      ledBlink(3, 100);
      currentState = IDLE;
      resultReceived = false;
    } 
    // Recebeu retorno
    else if (resultReceived) {
      if (resultStatus == "GRANTED") {
        ledBlink(1, 1000); // Exemplo de acesso permitido
      } else {
        ledBlink(5, 50); // Exemplo de acesso negado
      }
      currentState = IDLE;
      resultReceived = false;
    }
  }
}
