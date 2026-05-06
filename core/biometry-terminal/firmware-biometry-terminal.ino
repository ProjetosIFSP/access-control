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
const unsigned long ENROLLMENT_TIMEOUT_MS = 120000;

// ── Variáveis de estado ───────────────────────────────────────────────────────

char controllerId[48];

String topicHeartbeat;
String topicAccessAttempt;
String topicAccessResult;
String topicStatus;
String topicEnterEnrollment;
String topicEnrollmentResult;
String topicEnrollmentProgress;

enum State { IDLE, WAITING_RESULT, ENROLLMENT_MODE };
State currentState = IDLE;

enum EnrollmentStep {
  ENROLL_STEP_IDLE,
  ENROLL_STEP_WAITING_FIRST,
  ENROLL_STEP_WAITING_SECOND,
  ENROLL_STEP_CREATE_MODEL
};

EnrollmentStep enrollmentStep = ENROLL_STEP_IDLE;
String enrollmentId;
String enrollmentUserId;
String enrollmentFinger;
String enrollmentTemplateHex;
uint8_t enrollmentQuality = 0;
unsigned long enrollmentExpiresAt = 0;
unsigned long enrollmentStepAt = 0;

enum DoorState { OPEN, LOCKED, UNKNOWN };
DoorState currentDoorState = UNKNOWN;

unsigned long lastHeartbeat   = 0;
unsigned long waitingResultAt = 0;
unsigned long lastFingerTime  = 0;

bool   resultReceived = false;
String resultStatus   = "";

// Forward declarations for globals defined later in the sketch.
extern WiFiClient espClient;
extern PubSubClient mqtt;
extern SoftwareSerial fingerSerial;
extern Adafruit_Fingerprint finger;
extern String topicEnrollmentResult;
extern String topicEnrollmentProgress;

constexpr uint8_t TEMPLATE_EMPTY_CODE = 35;
constexpr size_t MAX_TEMPLATE_HEX_CHARS = 16384;

String bytesToHex(const uint8_t* data, size_t length) {
  String hex;
  hex.reserve(length * 2);
  for (size_t i = 0; i < length; i++) {
    if (data[i] < 16) hex += '0';
    hex += String(data[i], HEX);
  }
  hex.toLowerCase();
  return hex;
}

void clearFingerprintSerialInput() {
  while (fingerSerial.available()) {
    fingerSerial.read();
    delay(0);
  }
}

uint8_t writeEncryptionLevelRaw(uint8_t level) {
  clearFingerprintSerialInput();

  uint8_t commandData[] = {FINGERPRINT_WRITE_REG, 0x07, level};
  Adafruit_Fingerprint_Packet commandPacket(FINGERPRINT_COMMANDPACKET,
                                            sizeof(commandData), commandData);
  finger.writeStructuredPacket(commandPacket);

  uint8_t responseData[64] = {0};
  Adafruit_Fingerprint_Packet responsePacket(FINGERPRINT_ACKPACKET, 0,
                                             responseData);
  uint8_t packetResult = finger.getStructuredPacket(&responsePacket, 1500);
  if (packetResult != FINGERPRINT_OK) {
#ifdef DEBUG
    Serial.print(F("[BIO] PS_WriteReg(7) falhou ao ler resposta: "));
    Serial.println(packetResult);
#endif
    return packetResult;
  }

  return responsePacket.data[0];
}

uint8_t requestTemplateUpload(uint8_t bufferId) {
  clearFingerprintSerialInput();

  uint8_t commandData[] = {FINGERPRINT_UPLOAD, bufferId};
  Adafruit_Fingerprint_Packet commandPacket(FINGERPRINT_COMMANDPACKET,
                                            sizeof(commandData), commandData);
  finger.writeStructuredPacket(commandPacket);

  return FINGERPRINT_OK;
}

bool readRawFingerprintPacket(uint8_t &packetType,
                              uint16_t &packetLength,
                              uint16_t &packetDataLength,
                              uint8_t *packetData,
                              uint16_t timeoutMs) {
  auto readByte = [&](uint8_t &value, uint16_t &timer) -> bool {
    while (!fingerSerial.available()) {
      delay(1);
      timer++;
      if (timer >= timeoutMs) {
#ifdef DEBUG
        Serial.println(F("[BIO] Timeout aguardando packet raw."));
#endif
        return false;
      }
    }

    value = fingerSerial.read();
    return true;
  };

  uint16_t timer = 0;
  uint8_t byte = 0;

  while (true) {
    if (!readByte(byte, timer)) return false;
    if (byte != 0xEF) continue;

    if (!readByte(byte, timer)) return false;
    if (byte == 0x01) {
      break;
    }
  }

  // Endereço 32-bit do sensor. No nosso firmware usamos o endereço padrão.
  for (uint8_t i = 0; i < 4; i++) {
    if (!readByte(byte, timer)) return false;
  }

  if (!readByte(byte, timer)) return false;
  packetType = byte;

  if (!readByte(byte, timer)) return false;
  packetLength = static_cast<uint16_t>(byte) << 8;
  if (!readByte(byte, timer)) return false;
  packetLength |= byte;

  if (packetLength < 2 || packetLength > 258) {
#ifdef DEBUG
    Serial.print(F("[BIO] Packet com length inválido: "));
    Serial.println(packetLength);
#endif
    return false;
  }

  packetDataLength = packetLength - 2;
  for (uint16_t i = 0; i < packetDataLength; i++) {
    if (!readByte(packetData[i], timer)) return false;
  }

  // Checksum, ignorado aqui porque o objetivo é extrair o template bruto.
  if (!readByte(byte, timer)) return false;
  if (!readByte(byte, timer)) return false;

  return true;
}

bool readTemplateStream(String &templateHex, uint16_t timeoutMs) {
#ifdef DEBUG
  Serial.println(F("[BIO] Lendo stream raw do template..."));
#endif

  uint8_t packetNum = 0;
  while (true) {
    uint8_t packetType = 0;
    uint16_t packetLength = 0;
    uint16_t packetDataLength = 0;
    uint8_t packetData[256] = {0};

    if (!readRawFingerprintPacket(packetType, packetLength, packetDataLength,
                                  packetData, timeoutMs)) {
#ifdef DEBUG
      Serial.print(F("[BIO] Falha ao ler packet raw "));
      Serial.println(packetNum + 1);
#endif
      return false;
    }

    if (packetType == FINGERPRINT_ACKPACKET) {
      if (packetDataLength < 1) {
#ifdef DEBUG
        Serial.println(F("[BIO] ACK sem payload de status."));
#endif
        return false;
      }

      if (packetData[0] != FINGERPRINT_OK) {
#ifdef DEBUG
        Serial.print(F("[BIO] ACK retornou erro: 0x"));
        Serial.println(packetData[0], HEX);
#endif
        return false;
      }

#ifdef DEBUG
      Serial.println(F("[BIO] ACK OK recebido."));
#endif
      continue;
    }

    if (packetType != FINGERPRINT_DATAPACKET &&
        packetType != FINGERPRINT_ENDDATAPACKET) {
#ifdef DEBUG
      Serial.print(F("[BIO] Packet inesperado no stream: 0x"));
      Serial.println(packetType, HEX);
#endif
      return false;
    }

    if (templateHex.length() + (packetDataLength * 2) > MAX_TEMPLATE_HEX_CHARS) {
#ifdef DEBUG
      Serial.println(F("[BIO] ERRO: template excedeu o limite seguro do parser."));
#endif
      return false;
    }

    templateHex += bytesToHex(packetData, packetDataLength);
    packetNum++;

#ifdef DEBUG
    Serial.print(F("[BIO] Packet "));
    Serial.print(packetNum);
    Serial.print(F(": "));
    Serial.print(packetDataLength);
    Serial.print(F(" bytes"));
    if (packetType == FINGERPRINT_ENDDATAPACKET) {
      Serial.println(F(" (END)"));
    } else {
      Serial.println();
    }
#endif

    if (packetType == FINGERPRINT_ENDDATAPACKET) {
      break;
    }
  }

  // ZW101 templates are usually 512 bytes (1024 hex chars) or 256 bytes (512 hex chars).
  // Some firmware variants stream larger packets; we accept any non-empty
  // template that stays within the conservative parser cap.
  if (templateHex.length() < 512) {
#ifdef DEBUG
    Serial.print(F("[BIO] Template curto demais: "));
    Serial.print(templateHex.length() / 2);
    Serial.println(F(" bytes"));
#endif
    return false;
  }

#ifdef DEBUG
  Serial.print(F("[BIO] ✓ Template extraído! Tamanho: "));
  Serial.print(templateHex.length() / 2);
  Serial.println(F(" bytes"));
#endif

  return true;
}

bool captureTemplateHexFromSensor(String &templateHex) {
  // O ZW101 frequentemente retorna 0x23 nos buffers após createModel().
  // Estratégia principal: store → load → upload (mais confiável).
  uint16_t scratchSlot = (finger.capacity > 1) ? (finger.capacity - 1) : 0;

#ifdef DEBUG
  Serial.print(F("[BIO] Usando slot temporário: "));
  Serial.println(scratchSlot);
#endif

  if (finger.storeModel(scratchSlot) == FINGERPRINT_OK) {
    delay(100);
    if (finger.loadModel(scratchSlot) == FINGERPRINT_OK) {
      delay(100);
      if (captureTemplateFromBuffer(1, templateHex, 5000)) {
        finger.deleteModel(scratchSlot);
#ifdef DEBUG
        Serial.println(F("[BIO] Template extraído via store/load (buf 1)."));
#endif
        return true;
      }
      if (captureTemplateFromBuffer(2, templateHex, 5000)) {
        finger.deleteModel(scratchSlot);
#ifdef DEBUG
        Serial.println(F("[BIO] Template extraído via store/load (buf 2)."));
#endif
        return true;
      }
    }
    finger.deleteModel(scratchSlot);
  }

#ifdef DEBUG
  Serial.println(F("[BIO] Store/load falhou, tentando upload direto dos buffers..."));
#endif

  // Fallback: upload direto dos buffers (pode não funcionar em todos os ZW101)
  if (captureTemplateFromBuffer(1, templateHex, 5000)) {
#ifdef DEBUG
    Serial.println(F("[BIO] Template extraído do Buffer 1 (direto)."));
#endif
    return true;
  }

  if (captureTemplateFromBuffer(2, templateHex, 5000)) {
#ifdef DEBUG
    Serial.println(F("[BIO] Template extraído do Buffer 2 (direto)."));
#endif
    return true;
  }

#ifdef DEBUG
  Serial.println(F("[BIO] Falha crítica na extração do template."));
#endif
  return false;
}

bool captureTemplateFromBuffer(uint8_t bufferId, String &templateHex,
                               uint16_t timeoutMs) {
  templateHex = "";
  templateHex.reserve(MAX_TEMPLATE_HEX_CHARS);

  requestTemplateUpload(bufferId);
  return readTemplateStream(templateHex, timeoutMs);
}

bool captureAccessTemplateHex(String &templateHex) {
  if (finger.getImage() != FINGERPRINT_OK) return false;
  if (finger.image2Tz(1) != FINGERPRINT_OK) return false;
  return captureTemplateHexFromSensor(templateHex);
}

// ── Enrollment progress ──────────────────────────────────────────────────────

void publishEnrollmentProgress(const String &step) {
  // Payload leve: apenas enrollmentId + step (sem template).
  // Total ~90 bytes — cabe no buffer MQTT sem streaming.
  StaticJsonDocument<192> doc;
  doc["enrollmentId"] = enrollmentId;
  doc["step"] = step;
  String p;
  serializeJson(doc, p);
  mqtt.publish(topicEnrollmentProgress.c_str(), p.c_str());
#ifdef DEBUG
  Serial.print(F("[MQTT] enrollment-progress: "));
  Serial.println(step);
#endif
}

void resetEnrollmentState() {
  enrollmentStep = ENROLL_STEP_IDLE;
  enrollmentId = "";
  enrollmentUserId = "";
  enrollmentFinger = "";
  enrollmentTemplateHex = "";
  enrollmentQuality = 0;
  enrollmentExpiresAt = 0;
  enrollmentStepAt = 0;
  currentState = IDLE;
  clearFingerprintSerialInput();
}

void publishEnrollmentResult(const String &enrollmentIdValue,
                             const String &userIdValue,
                             const String &fingerValue,
                             const String &status,
                             const String &templateHex,
                             uint8_t quality) {
  // Calcula tamanho EXATO do payload JSON para streaming MQTT.
  //
  // Literais (contadas char a char):
  //   {"enrollmentId":"    = 17      ","userId":"      = 12
  //   ","finger":"         = 12      ","status":"     = 12
  //   ","quality":         = 12      ,"deviceSecret":" = 17
  //   ","template":"       = 14 (opt)  "}              = 2
  // Fixo sem template: 17+12+12+12+12+17+2 = 84

  char qualityStr[4];
  snprintf(qualityStr, sizeof(qualityStr), "%u", quality);

  size_t payloadLen = 84;
  payloadLen += enrollmentIdValue.length();
  payloadLen += userIdValue.length();
  payloadLen += fingerValue.length();
  payloadLen += status.length();
  payloadLen += strlen(qualityStr);
  payloadLen += strlen(DEVICE_SECRET);
  if (templateHex.length() > 0) {
    payloadLen += 14 + templateHex.length();
  }

#ifdef DEBUG
  Serial.print(F("[MQTT] Payload calculado: "));
  Serial.print(payloadLen);
  Serial.print(F(" bytes (template hex: "));
  Serial.print(templateHex.length());
  Serial.println(F(" chars)"));
#endif

  if (mqtt.beginPublish(topicEnrollmentResult.c_str(), payloadLen, false)) {
    mqtt.print(F("{\"enrollmentId\":\""));
    mqtt.print(enrollmentIdValue);
    mqtt.print(F("\",\"userId\":\""));
    mqtt.print(userIdValue);
    mqtt.print(F("\",\"finger\":\""));
    mqtt.print(fingerValue);
    mqtt.print(F("\",\"status\":\""));
    mqtt.print(status);
    mqtt.print(F("\",\"quality\":"));
    mqtt.print(qualityStr);
    mqtt.print(F(",\"deviceSecret\":\""));
    mqtt.print(DEVICE_SECRET);
    if (templateHex.length() > 0) {
      mqtt.print(F("\",\"template\":\""));
      mqtt.print(templateHex);
    }
    mqtt.print(F("\"}"));
    mqtt.endPublish();
#ifdef DEBUG
    Serial.print(F("[MQTT] Published enrollment-result (stream): "));
    Serial.print(payloadLen);
    Serial.println(F(" bytes"));
#endif
  } else {
#ifdef DEBUG
    Serial.println(F("[MQTT] ERRO: beginPublish falhou para enrollment-result."));
#endif
  }
}

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
    mqtt.subscribe(topicEnterEnrollment.c_str());
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
  doc["sensorModel"]     = "ZW-101";
  
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

void publishAccessAttempt(const String& templateHex) {
  // Streaming MQTT publish — evita duplicar o template na heap.
  size_t payloadLen = 2; // {}
  payloadLen += 24 + 11;                            // "credentialType":"FINGERPRINT"
  payloadLen += 20 + templateHex.length();           // "credentialValue":"..."
  payloadLen += 18 + strlen(DEVICE_SECRET);          // "deviceSecret":"..."
  payloadLen += 6;                                   // separadores

  if (mqtt.beginPublish(topicAccessAttempt.c_str(), payloadLen, false)) {
    mqtt.print(F("{\"credentialType\":\"FINGERPRINT\",\"credentialValue\":\""));
    mqtt.print(templateHex);
    mqtt.print(F("\",\"deviceSecret\":\""));
    mqtt.print(DEVICE_SECRET);
    mqtt.print(F("\"}"));
    mqtt.endPublish();
  }

#ifdef DEBUG
  Serial.print(F("[BIO] Access-attempt -> template bytes: "));
  Serial.println(templateHex.length() / 2);
#endif
}

// =============================================================================
//  CALLBACK MQTT
// =============================================================================

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String t = String(topic);

  // access-result
  if (t == topicAccessResult) {
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, payload, length)) return;
    const char* status = doc["status"];
    if (!status) return;
    resultStatus   = String(status);
    resultReceived = true;
#ifdef DEBUG
    Serial.print(F("[MQTT] Result: ")); Serial.println(resultStatus);
#endif
    return;
  }

  // enter-enrollment-mode
  if (t == topicEnterEnrollment) {
    StaticJsonDocument<384> doc;
    if (deserializeJson(doc, payload, length)) return;
    const char* enrollmentIdValue = doc["enrollmentId"] | "";
    const char* userId = doc["userId"] | "";
    const char* fingerName = doc["finger"] | "";
    enrollmentExpiresAt = millis() + ENROLLMENT_TIMEOUT_MS;

#ifdef DEBUG
    Serial.print(F("[MQTT] Enter enrollment: "));
    Serial.println(enrollmentIdValue);
    Serial.print(F("[MQTT] Enrollment timeout local: "));
    Serial.print(ENROLLMENT_TIMEOUT_MS / 1000);
    Serial.println(F("s"));
    Serial.println(F("[BIO] Modo de cadastro ativo. Aguarde a primeira passagem e repita o dedo quando solicitado."));
#endif

    enrollmentId = String(enrollmentIdValue);
    enrollmentUserId = String(userId);
    enrollmentFinger = String(fingerName);
    enrollmentTemplateHex = "";
    enrollmentQuality = 0;
    enrollmentStep = ENROLL_STEP_WAITING_FIRST;
    enrollmentStepAt = millis();
    currentState = ENROLLMENT_MODE;
    publishEnrollmentProgress("WAITING_FIRST");
    return;
  }
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
  int baudRates[] = {57600, 9600, 115200, 19200};
  bool found = false;

  for (int i = 0; i < 4; i++) {
    finger.begin(baudRates[i]);
    delay(100);
    if (finger.verifyPassword()) {
#ifdef DEBUG
      Serial.print("[BIO] Sensor biométrico encontrado a ");
      Serial.print(baudRates[i]);
      Serial.println(" baud!");
#endif
      finger.getParameters();

      // O manual do ZW-111 define encryption level no registrador 7.
      // PS_UpChar (upload/download de template) exige nivel 0.
      uint8_t securityResult = writeEncryptionLevelRaw(0);
      delay(100);

      finger.getParameters();
    #ifdef DEBUG
      if (securityResult == FINGERPRINT_OK) {
        Serial.println(F("[BIO] Encryption level configurado para 0 via PS_WriteReg(reg 7)."));
        Serial.println(F("[BIO] Observacao: finger.security_level vem de SysPara/reg 5 e nao reflete o encryption level."));
      } else {
        Serial.print(F("[BIO] Aviso: PS_WriteReg(reg 7, 0) retornou "));
        Serial.println(securityResult);
      }
    #endif
      if (finger.packet_len != FINGERPRINT_PACKET_SIZE_256) {
        finger.setPacketSize(FINGERPRINT_PACKET_SIZE_256);
        delay(150);
        finger.getParameters();
      }
      
#ifdef DEBUG
      Serial.print(F("[BIO] Capacidade: ")); Serial.println(finger.capacity);
      Serial.print(F("[BIO] SysPara security_level (reg 5): ")); Serial.println(finger.security_level);
      Serial.print(F("[BIO] SysPara status_reg: 0x")); Serial.println(finger.status_reg, HEX);
#endif
      found = true;
      break;
    }
  }

  if (!found) {
#ifdef DEBUG
    Serial.println("[BIO] Erro: Não foi possível encontrar o sensor biométrico.");
#endif
  }
}

void processEnrollment(unsigned long now, bool touched) {
  if (enrollmentStep == ENROLL_STEP_IDLE) {
    return;
  }

  if (enrollmentExpiresAt > 0 && now >= enrollmentExpiresAt) {
    publishEnrollmentProgress("EXPIRED");
    publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "EXPIRED", "", 0);
    resetEnrollmentState();
    return;
  }

  switch (enrollmentStep) {
    case ENROLL_STEP_WAITING_FIRST:
      if (touched && (now - enrollmentStepAt >= FINGER_DEBOUNCE_MS)) {
        if (finger.getImage() == FINGERPRINT_OK && finger.image2Tz(1) == FINGERPRINT_OK) {
          enrollmentStep = ENROLL_STEP_WAITING_SECOND;
          enrollmentStepAt = now;
          publishEnrollmentProgress("FIRST_CAPTURED");
#ifdef DEBUG
          Serial.println(F("[BIO] Primeira passagem capturada. Retire o dedo e encoste novamente."));
#endif
        }
      }
      break;

    case ENROLL_STEP_WAITING_SECOND:
      if (touched && (now - enrollmentStepAt >= 1200)) {
        if (finger.getImage() == FINGERPRINT_OK && finger.image2Tz(2) == FINGERPRINT_OK) {
          enrollmentStep = ENROLL_STEP_CREATE_MODEL;
          enrollmentStepAt = now;
          publishEnrollmentProgress("SECOND_CAPTURED");
#ifdef DEBUG
          Serial.println(F("[BIO] Segunda passagem capturada."));
#endif
        }
      }
      break;

    case ENROLL_STEP_CREATE_MODEL: {
#ifdef DEBUG
      Serial.println(F("[BIO] Preparando sensor para createModel()..."));
#endif
      clearFingerprintSerialInput();
      delay(250);
      publishEnrollmentProgress("CREATING_MODEL");

      uint8_t result = finger.createModel();
      if (result != FINGERPRINT_OK) {
#ifdef DEBUG
        Serial.print(F("[BIO] createModel falhou: "));
        Serial.println(result);
#endif
        publishEnrollmentProgress("FAILED");
        publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "FAILED", "", 0);
        resetEnrollmentState();
        return;
      }

#ifdef DEBUG
      Serial.println(F("[BIO] createModel OK! Iniciando ciclo de extração..."));
#endif
      delay(200);
      publishEnrollmentProgress("EXTRACTING");

      if (enrollmentTemplateHex.length() == 0) {
        // Escreve diretamente em enrollmentTemplateHex para evitar
        // duplicação de ~15KB na heap (OOM no ESP8266).
        if (!captureTemplateHexFromSensor(enrollmentTemplateHex)) {
          publishEnrollmentProgress("FAILED");
          publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "FAILED", "", 0);
          resetEnrollmentState();
          return;
        }
      }

      enrollmentQuality = 0;
      publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "SUCCESS", enrollmentTemplateHex, enrollmentQuality);
      resetEnrollmentState();
      return;
    }

    default:
      break;
  }
}

// Tenta realizar uma leitura (modo simples)
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
  topicEnterEnrollment = String("door/") + controllerId + "/enter-enrollment-mode";
  topicEnrollmentResult = String("door/") + controllerId + "/enrollment-result";
  topicEnrollmentProgress = String("door/") + controllerId + "/enrollment-progress";

#ifdef DEBUG
  Serial.print(F("Controller ID: ")); Serial.println(controllerId);
  Serial.println(F("Inicializando..."));
#endif

  connectWifi();
  mqtt.setServer(MQTT_SERVER, atoi(MQTT_PORT));
  mqtt.setBufferSize(16384);
  mqtt.setCallback(onMqttMessage);
  
  setupFingerprint();
}

// =============================================================================
//  LOOP
// =============================================================================

void loop() {
  unsigned long now = millis();

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

  if (currentState == ENROLLMENT_MODE) {
    bool touched = digitalRead(PIN_TOUCHOUT) == HIGH;
    processEnrollment(now, touched);
    return;
  }

  // --- Lógica de pareamento / Leitura ---
  
  // Exemplo de uso com PIN_TOUCHOUT (pino em HIGH quando o dedo é encostado):
  // Aqui você pode melhorar para acionar a leitura apenas quando PIN_TOUCHOUT == HIGH.
  bool touched = digitalRead(PIN_TOUCHOUT) == HIGH;
  
  // Por ora, vamos apenas checar IDLE state
  if (currentState == IDLE && touched) {
    if (millis() - lastFingerTime > FINGER_DEBOUNCE_MS) {
      String accessTemplateHex;
      if (captureAccessTemplateHex(accessTemplateHex)) {
        publishAccessAttempt(accessTemplateHex);
        currentState = WAITING_RESULT;
        waitingResultAt = millis();
        lastFingerTime = millis();
      }
    }
  }

  if (currentState == WAITING_RESULT) {
    // Timeout
    if (now - waitingResultAt > ACCESS_RESULT_TIMEOUT) {
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
