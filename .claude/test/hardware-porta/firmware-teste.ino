#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── Configuração — editar antes de carregar ───────────────
const char* WIFI_SSID     = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";
const char* MQTT_SERVER   = "IP_DO_BROKER";  // IP do computador rodando npm run dev:iot
const int   MQTT_PORT     = 1883;

// ID do controlador — deve existir no banco ou ser criado pelo register
const char* CONTROLLER_ID = "esp32-porta-teste";
const char* ROOM_ID       = "UUID_DA_SALA";  // obter via: curl http://localhost:3333/rooms

// Pinos
const int PIN_DOOR_SENSOR = 35;  // botão (simulando reed switch) — INPUT_PULLUP
const int PIN_CURRENT     = 34;  // SCT-013 (ADC — somente leitura)

// Intervalos
const unsigned long HEARTBEAT_INTERVAL = 30000;  // 30s
const unsigned long STATUS_INTERVAL    = 500;    // 500ms (publica só se mudou)

// Threshold ADC para detectar corrente no SCT-013
// Ajustar conforme a carga e o burden resistor utilizados
const int CURRENT_THRESHOLD = 100;

// Versão do firmware reportada ao servidor
const char* FIRMWARE_VERSION = "0.1.0-test";

// ── Variáveis de tópico MQTT ──────────────────────────────
String topicRegister;
String topicHeartbeat;
String topicStatus;
String topicAccessAttempt;
String topicAccessResult;
String topicCommand;
String topicCommandResult;

// ── Estado interno ────────────────────────────────────────
WiFiClient   espClient;
PubSubClient mqtt(espClient);

bool          lastDoorOpen  = false;
bool          lastIsLocked  = false;
unsigned long lastHeartbeat = 0;
unsigned long lastStatusSend = 0;

// ── Protótipos ────────────────────────────────────────────
void connectWiFi();
void connectMQTT();
void onMqttMessage(char* topic, byte* payload, unsigned int length);
void registerController();
void sendHeartbeat();
void readAndSendStatus();
void handleCommand(const String& msg);

// ─────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32S — Controlador de Porta (Teste) ===");

  // Configurar pinos
  pinMode(PIN_DOOR_SENSOR, INPUT_PULLUP);
  // PIN_CURRENT é ADC — sem necessidade de pinMode explícito

  // Montar strings de tópico com o ID do controlador
  String id      = String(CONTROLLER_ID);
  topicRegister      = "door/" + id + "/register";
  topicHeartbeat     = "door/" + id + "/heartbeat";
  topicStatus        = "door/" + id + "/status";
  topicAccessAttempt = "door/" + id + "/access-attempt";
  topicAccessResult  = "door/" + id + "/access-result";
  topicCommand       = "door/" + id + "/command";
  topicCommandResult = "door/" + id + "/command-result";

  // Conectar infraestrutura
  connectWiFi();
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  connectMQTT();

  // Registrar controlador no sistema
  registerController();

  Serial.println("=== Setup concluído ===\n");
}

// ─────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────
void loop() {
  // Manter conexão MQTT viva
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();

  unsigned long now = millis();

  // Heartbeat periódico
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = now;
  }

  // Leitura e envio de status (somente se houve mudança)
  if (now - lastStatusSend >= STATUS_INTERVAL) {
    readAndSendStatus();
    lastStatusSend = now;
  }
}

// ─────────────────────────────────────────────────────────
//  CONECTIVIDADE
// ─────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Wi-Fi conectado! IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Conectando ao broker MQTT...");

    if (mqtt.connect(CONTROLLER_ID)) {
      Serial.println(" conectado!");

      // Assinar tópicos que o servidor publica para este controlador
      mqtt.subscribe(topicAccessResult.c_str());
      mqtt.subscribe(topicCommand.c_str());

      Serial.println("Subscriptions ativas:");
      Serial.println("  " + topicAccessResult);
      Serial.println("  " + topicCommand);
    } else {
      Serial.print(" falhou (rc=");
      Serial.print(mqtt.state());
      Serial.println("). Tentando novamente em 5s...");
      delay(5000);
    }
  }
}

// ─────────────────────────────────────────────────────────
//  CALLBACK MQTT
// ─────────────────────────────────────────────────────────
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  Serial.print("MQTT recebido [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(msg);

  if (String(topic) == topicCommand) {
    handleCommand(msg);
  }
  // access-result é tratado aqui se necessário (ex: acionar LED)
  // Por ora apenas logamos — o ACK de acesso é feito via access-result diretamente
}

// ─────────────────────────────────────────────────────────
//  REGISTRO
// ─────────────────────────────────────────────────────────
void registerController() {
  JsonDocument doc;
  doc["roomId"]          = ROOM_ID;
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);

  mqtt.publish(topicRegister.c_str(), payload.c_str());
  Serial.println("Registro enviado: " + payload);
}

// ─────────────────────────────────────────────────────────
//  HEARTBEAT
// ─────────────────────────────────────────────────────────
void sendHeartbeat() {
  JsonDocument doc;
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);

  mqtt.publish(topicHeartbeat.c_str(), payload.c_str());
  Serial.println("Heartbeat enviado");
}

// ─────────────────────────────────────────────────────────
//  STATUS DA PORTA
// ─────────────────────────────────────────────────────────
void readAndSendStatus() {
  // ── Leitura do sensor de porta (botão com pull-up / reed switch) ──
  // INPUT_PULLUP: pino LOW quando botão pressionado (porta fechada)
  bool doorClosed = (digitalRead(PIN_DOOR_SENSOR) == LOW);
  bool doorOpen   = !doorClosed;
  String doorState = doorClosed ? "CLOSED" : "OPEN";

  // ── Leitura do SCT-013 (corrente da fechadura) ────────────────────
  // Calcula RMS de 100 amostras em ~20ms (cobre 1 ciclo de 60Hz)
  long sumSq = 0;
  for (int i = 0; i < 100; i++) {
    int reading = analogRead(PIN_CURRENT) - 2048;  // offset para ponto médio (12-bit ADC = 0..4095)
    sumSq += (long)reading * reading;
    delayMicroseconds(200);  // ~20ms total para 100 amostras
  }
  float rms      = sqrt((float)sumSq / 100.0f);
  bool isLocked  = (rms > CURRENT_THRESHOLD);

  // Publicar somente se o estado mudou desde a última publicação
  if (doorOpen != lastDoorOpen || isLocked != lastIsLocked) {
    JsonDocument doc;
    doc["doorState"] = doorState;
    doc["isLocked"]  = isLocked;

    String payload;
    serializeJson(doc, payload);

    mqtt.publish(topicStatus.c_str(), payload.c_str());

    Serial.print("Status publicado: ");
    Serial.println(payload);

    lastDoorOpen = doorOpen;
    lastIsLocked = isLocked;
  }
}

// ─────────────────────────────────────────────────────────
//  HANDLER DE COMANDOS
// ─────────────────────────────────────────────────────────
void handleCommand(const String& msg) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, msg);

  if (err) {
    Serial.print("Erro ao parsear comando: ");
    Serial.println(err.c_str());
    return;
  }

  String commandId = doc["commandId"].as<String>();
  String type      = doc["type"].as<String>();

  Serial.print("Comando recebido: ");
  Serial.print(type);
  Serial.print(" (commandId: ");
  Serial.print(commandId);
  Serial.println(")");

  String status = "COMPLETED";

  if (type == "UNLOCK") {
    // TODO: acionar relé (pino do relé, nível LOW para energizar por ex.)
    // digitalWrite(PIN_RELAY, LOW);
    // delay(5000);
    // digitalWrite(PIN_RELAY, HIGH);
    Serial.println("[stub] Relé de UNLOCK acionado (sem hardware de atuação)");

  } else if (type == "LOCK") {
    // TODO: garantir que o relé está desligado (fechadura travada)
    // digitalWrite(PIN_RELAY, HIGH);
    Serial.println("[stub] Relé de LOCK acionado (sem hardware de atuação)");

  } else if (type == "SYNC_STATE") {
    // Forçar publicação imediata do status atual
    lastDoorOpen = !lastDoorOpen;  // invalida cache para forçar publicação
    lastIsLocked = !lastIsLocked;
    readAndSendStatus();
    Serial.println("SYNC_STATE: status atual publicado");

  } else {
    status = "REJECTED";
    Serial.print("Comando desconhecido ignorado: ");
    Serial.println(type);
  }

  // Publicar ACK de volta ao servidor
  JsonDocument ack;
  ack["commandId"] = commandId;
  ack["status"]    = status;

  String ackPayload;
  serializeJson(ack, ackPayload);

  mqtt.publish(topicCommandResult.c_str(), ackPayload.c_str());
  Serial.println("ACK enviado: " + ackPayload);
}