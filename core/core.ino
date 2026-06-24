esp32#include <WiFi.h>
#include <DNSServer.h>
#include "esp_system.h"
#if __has_include("esp_mac.h")
#include "esp_mac.h"
#endif
#include <WebServer.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

#include "Config.h"
#include "NfcManager.h"
#include "BiometryManager.h"

// ── Controle do Relé ──────────────────────────────────────────────────────────
// Usa GPIO_MODE_DISABLE para desconectar completamente o pino (relé OFF)
// e GPIO_MODE_OUTPUT com nível LOW para ativar o relé (relé ON).
// Circuito: V+ Colmeia → COM, NC → Fechadura (fail-safe)

#include "driver/gpio.h"

void relayLock() {
  gpio_set_direction((gpio_num_t)PIN_RELAY, GPIO_MODE_DISABLE);
  gpio_set_pull_mode((gpio_num_t)PIN_RELAY, GPIO_FLOATING);
  Serial.println(F("[Relé] LOCK"));
}

void relayUnlock() {
  gpio_set_direction((gpio_num_t)PIN_RELAY, GPIO_MODE_OUTPUT);
  gpio_set_level((gpio_num_t)PIN_RELAY, 0);
  Serial.println(F("[Relé] UNLOCK"));
}

// ── Globais (Declaradas como extern em Config.h) ──────────────────────────────
char controllerId[48];
char DEVICE_SECRET[40] = "Zx9kPq2mRn7vWj4tYb8cLe";

DoorState currentDoorState = UNKNOWN;
TerminalState currentState = IDLE;

String pendingTagUid = "";
int pendingSlotId = -1;
String pendingCredentialId = "";
uint16_t pendingConfidence = 0;
bool pendingCacheStore = false;

// ── MQTT & Wi-Fi ─────────────────────────────────────────────────────────────
char WIFI_SSID[32]     = "Miguel";
char WIFI_PASSWORD[64] = "Mmh020516";
char MQTT_SERVER[40]   = "192.168.0.121";
char MQTT_PORT[6]      = "1883";

bool shouldSaveConfig = false;

WiFiClient espClient;
PubSubClient mqtt(espClient);

// Tópicos
String topicHeartbeat;
String topicAccessAttempt;
String topicAccessResult;
String topicStatus;
String topicEnterEnrollment;
String topicEnrollmentResult;
String topicEnrollmentProgress;
String topicLocalMatch;
String topicSyncTemplate;
String topicRequestSync;
String topicSyncComplete;
String topicSyncState;

String topicCommand;

unsigned long lastHeartbeat = 0;
unsigned long waitingResultAt = 0;
unsigned long lastMqttAttempt = 0;

String getMacAddress() {
	uint8_t baseMac[6];
	esp_efuse_mac_get_default(baseMac);
	char baseMacChr[18] = {0};
	sprintf(baseMacChr, "%02X:%02X:%02X:%02X:%02X:%02X", baseMac[0], baseMac[1], baseMac[2], baseMac[3], baseMac[4], baseMac[5]);
	return String(baseMacChr);
}

void saveConfigCallback () {
  Serial.println("[Wi-Fi] Configuração salva.");
  shouldSaveConfig = true;
}

void connectWifi() {
  if (!LittleFS.begin(true)) {
    Serial.println("[LittleFS] Falha ao montar.");
  }

  if (LittleFS.exists("/config.json")) {
    File configFile = LittleFS.open("/config.json", "r");
    if (configFile) {
      size_t size = configFile.size();
      std::unique_ptr<char[]> buf(new char[size]);
      configFile.readBytes(buf.get(), size);
      StaticJsonDocument<200> doc;
      if (!deserializeJson(doc, buf.get())) {
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

  if (!wifiManager.autoConnect("access-control-unified", "admin123")) {
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

  Serial.print(F("[Wi-Fi] Conectado. IP: "));
  Serial.println(WiFi.localIP());
}

// ── Publicações MQTT ─────────────────────────────────────────────────────────

void publishRegister() {
  StaticJsonDocument<256> doc;
  doc["controllerId"]    = controllerId;
  doc["firmwareVersion"] = "1.0.0-unified-esp32";
  doc["sensors"]         = "RC522, ZW-101";
  
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

void connectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - lastMqttAttempt < 5000) return;
  lastMqttAttempt = millis();
  
  String clientId = String("esp32-") + controllerId;
  
  if (mqtt.connect(clientId.c_str())) {
    mqtt.subscribe(topicAccessResult.c_str());
    mqtt.subscribe(topicEnterEnrollment.c_str());
    mqtt.subscribe(topicSyncTemplate.c_str());
    mqtt.subscribe(topicSyncComplete.c_str());
    mqtt.subscribe(topicSyncState.c_str());
    mqtt.subscribe(topicCommand.c_str());
    publishRegister();
    lastHeartbeat = millis() - HEARTBEAT_INTERVAL_MS;
    Serial.println(F("[MQTT] Conectado."));
  }
}

// ── Callbacks acionados pelas bibliotecas ───────────────────────────────────

void publishAccessAttemptNfc(const String& uid) {
  StaticJsonDocument<256> doc;
  doc["credentialType"]  = "NFC_TAG";
  doc["credentialValue"] = uid;
  doc["deviceSecret"]    = DEVICE_SECRET;

  String p; serializeJson(doc, p);
  mqtt.publish(topicAccessAttempt.c_str(), p.c_str());

  currentState = WAITING_RESULT;
  waitingResultAt = millis();
}

void publishLocalMatchBio(int slotId, const char* credentialId, uint16_t confidence) {
  StaticJsonDocument<256> doc;
  doc["credentialId"] = credentialId;
  doc["confidence"]   = confidence;
  doc["slotId"]       = slotId;
  doc["deviceSecret"] = DEVICE_SECRET;
  String p; serializeJson(doc, p);
  mqtt.publish(topicLocalMatch.c_str(), p.c_str());
  
  pendingSlotId = slotId;
  currentState = WAITING_RESULT;
  waitingResultAt = millis();
}

void publishRequestSync() {
  StaticJsonDocument<128> doc;
  doc["deviceSecret"] = DEVICE_SECRET;
  String p; serializeJson(doc, p);
  mqtt.publish(topicRequestSync.c_str(), p.c_str());
}

void publishDoorStatus() {
  StaticJsonDocument<128> doc;
  const char* stateStr;
  switch (currentDoorState) {
    case OPEN:     stateStr = "OPEN"; break;
    case CLOSED:   stateStr = "CLOSED"; break;
    case UNLOCKED: stateStr = "UNLOCKED"; break;
    case LOCKED:   stateStr = "LOCKED"; break;
    default:       stateStr = "UNKNOWN"; break;
  }
  doc["doorState"] = stateStr;
  doc["isLocked"]  = (currentDoorState == LOCKED);
  String p; serializeJson(doc, p);
  mqtt.publish(topicStatus.c_str(), p.c_str());
}

void publishEnrollmentProgress(const String &enrollmentIdValue, const String &step) {
  StaticJsonDocument<192> doc;
  doc["enrollmentId"] = enrollmentIdValue;
  doc["step"] = step;
  String p; serializeJson(doc, p);
  mqtt.publish(topicEnrollmentProgress.c_str(), p.c_str());
}

void publishEnrollmentResult(const String &enrollmentIdValue, const String &userIdValue, const String &fingerValue, const String &status, bool hasTemplate, uint8_t quality) {
  char qualityStr[4];
  snprintf(qualityStr, sizeof(qualityStr), "%u", quality);

  size_t payloadLen = 84;
  payloadLen += enrollmentIdValue.length();
  payloadLen += userIdValue.length();
  payloadLen += fingerValue.length();
  payloadLen += status.length();
  payloadLen += strlen(qualityStr);
  payloadLen += strlen(DEVICE_SECRET);
  
  File f;
  if (hasTemplate) {
    f = LittleFS.open("/temp_template.hex", "r");
    if (f) {
      payloadLen += 14 + f.size();
    } else {
      hasTemplate = false;
    }
  }

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
    if (hasTemplate && f) {
      mqtt.print(F("\",\"template\":\""));
      while (f.available()) {
        uint8_t buf[256];
        size_t n = f.read(buf, sizeof(buf));
        mqtt.write(buf, n);
      }
      f.close();
    }
    mqtt.print(F("\"}"));
    mqtt.endPublish();
  }
}

// ── Recepção MQTT ────────────────────────────────────────────────────────────

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String t = String(topic);

  if (t == topicAccessResult) {
    StaticJsonDocument<384> doc;
    if (deserializeJson(doc, payload, length)) return;
    const char* status = doc["status"];
    if (!status) return;
    
    bool granted = (String(status) == "GRANTED");
    
    if (granted) {
      Serial.println(F("[Acesso] GRANTED"));
      
      if (currentDoorState == LOCKED || currentDoorState == UNKNOWN) {
        currentDoorState = UNLOCKED;
        relayUnlock();
        digitalWrite(PIN_LED, HIGH); 
        sensorLedGreen(); 
      } else {
        currentDoorState = LOCKED;
        relayLock();
        digitalWrite(PIN_LED, LOW);
        sensorLedOff();
      }
      publishDoorStatus();

      // Cache de biometria
      const char* credId = doc["credentialId"] | "";
      if (strlen(credId) > 0) {
        cacheCurrentTemplate(String(credId));
      }
    } else {
      Serial.println(F("[Acesso] DENIED"));
      sensorLedRed(4);
      
      // Remove do cache local se credencial foi revogada no servidor
      if (pendingSlotId >= 0) {
        evictSlot(pendingSlotId);
      }
    }
    
    currentState = IDLE;
    return;
  }

  if (t == topicEnterEnrollment) {
    StaticJsonDocument<384> doc;
    if (deserializeJson(doc, payload, length)) return;
    const char* enrollId = doc["enrollmentId"] | "";
    const char* userId = doc["userId"] | "";
    const char* fingerName = doc["finger"] | "";
    
    startEnrollment(String(enrollId), String(userId), String(fingerName));
    return;
  }

  if (t == topicSyncTemplate) {
    handleSyncTemplate(payload, length);
    return;
  }

  if (t == topicSyncComplete) {
    handleSyncComplete();
    return;
  }

  if (t == topicCommand) {
    StaticJsonDocument<384> doc;
    if (deserializeJson(doc, payload, length)) return;
    const char* cmdType = doc["type"];
    const char* cmdId = doc["commandId"];
    
    if (cmdType) {
      if (strcmp(cmdType, "UNLOCK") == 0) {
        currentDoorState = UNLOCKED;
        relayUnlock();
        digitalWrite(PIN_LED, HIGH);
        sensorLedGreen();
        Serial.println(F("[Comando] UNLOCK -> Porta destrancada"));
        publishDoorStatus();
      } else if (strcmp(cmdType, "LOCK") == 0) {
        currentDoorState = LOCKED;
        relayLock();
        digitalWrite(PIN_LED, LOW);
        sensorLedOff();
        Serial.println(F("[Comando] LOCK -> Porta trancada"));
        publishDoorStatus();
      }

      // ACK do comando
      if (cmdId) {
        StaticJsonDocument<128> ackDoc;
        ackDoc["commandId"] = cmdId;
        ackDoc["status"] = "COMPLETED";
        String ackStr; serializeJson(ackDoc, ackStr);
        String topicAck = String("door/") + controllerId + "/command-result";
        mqtt.publish(topicAck.c_str(), ackStr.c_str());
      }
    }
    return;
  }

  // Sincronização do estado da porta ao iniciar
  if (t == topicSyncState) {
    StaticJsonDocument<128> doc;
    if (deserializeJson(doc, payload, length)) return;
    const char* doorState = doc["doorState"];
    bool isLocked = doc["isLocked"] | true; // default: trancada
    if (!doorState) return;

    if (strcmp(doorState, "UNLOCKED") == 0 || (strcmp(doorState, "OPEN") == 0 && !isLocked)) {
      currentDoorState = UNLOCKED;
      relayUnlock();
      digitalWrite(PIN_LED, HIGH);
      sensorLedGreen();
      Serial.println(F("[Sync] Estado do servidor: DESTRANCADA"));
    } else {
      currentDoorState = LOCKED;
      relayLock();
      digitalWrite(PIN_LED, LOW);
      sensorLedOff();
      Serial.println(F("[Sync] Estado do servidor: TRANCADA"));
    }
    publishDoorStatus();
    return;
  }
}

// ── Main Setup & Loop ────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("\n\n  Gerenciamento de Acesso IoT\n"));

  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  // Estado inicial da fechadura: TRANCADA
  relayLock();
  currentDoorState = LOCKED;

  String mac = getMacAddress();
  mac.replace(":", "");
  mac.toUpperCase();
  snprintf(controllerId, sizeof(controllerId), "esp32-%s", mac.c_str());

  topicHeartbeat          = String("door/") + controllerId + "/heartbeat";
  topicAccessAttempt      = String("door/") + controllerId + "/access-attempt";
  topicAccessResult       = String("door/") + controllerId + "/access-result";
  topicStatus             = String("door/") + controllerId + "/status";
  topicEnterEnrollment    = String("door/") + controllerId + "/enter-enrollment-mode";
  topicEnrollmentResult   = String("door/") + controllerId + "/enrollment-result";
  topicEnrollmentProgress = String("door/") + controllerId + "/enrollment-progress";
  topicLocalMatch         = String("door/") + controllerId + "/local-match";
  topicSyncTemplate       = String("door/") + controllerId + "/sync-template";
  topicRequestSync        = String("door/") + controllerId + "/request-sync";
  topicSyncComplete       = String("door/") + controllerId + "/sync-complete";
  topicSyncState          = String("door/") + controllerId + "/sync-state";
  topicCommand            = String("door/") + controllerId + "/command";

  connectWifi();
  
  mqtt.setServer(MQTT_SERVER, atoi(MQTT_PORT));
  mqtt.setBufferSize(8192);
  mqtt.setCallback(onMqttMessage);

  setupNfc();
  setupBiometry();

  Serial.println(F("[Sistema] Pronto."));
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      connectMqtt();
    } else {
      mqtt.loop();
    }
  }

  unsigned long now = millis();
  if (mqtt.connected() && (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS)) {
    sendHeartbeat();
    lastHeartbeat = now;
  }

  if (currentState == WAITING_RESULT) {
    if (now - waitingResultAt >= ACCESS_RESULT_TIMEOUT) {
      Serial.println(F("[Acesso] Timeout."));
      sensorLedRed(3);
      currentState = IDLE;
    }
  }

  loopNfc();
  loopBiometry();
}
