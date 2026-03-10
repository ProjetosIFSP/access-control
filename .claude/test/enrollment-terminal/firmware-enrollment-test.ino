// =============================================================================
// firmware-enrollment-test.ino
// Terminal de Enrollment Biométrico — ESP32S + ZN-53X / A21 UART
//
// Propósito: validar incrementalmente o fluxo de enrollment biométrico
//   Passo 1: compatibilidade do ZN-53X com protocolo R30x (Adafruit)
//   Passo 2: captura de 2 passagens e geração de template (createModel)
//   Passo 3: extração do template de 256 bytes via UploadTemplate (0x08)
//   Passo 4: transmissão do template ao backend via MQTT
//   Passo 5: download de template externo de volta ao sensor (0x09)
//   Passo 6: matching local após sincronização (fingerFastSearch)
//
// Comandos disponíveis no Serial Monitor:
//   TEST_ENROLL              — executa passos 2 e 3 localmente
//   TEST_UPLOAD              — re-extrai template do último createModel
//   TEST_DOWNLOAD <hex512>   — carrega template hex no slot 5 do sensor
//   TEST_SEARCH              — captura dedo e executa fingerFastSearch
//   TEST_CLEAR               — limpa todos os templates da memória do sensor
//   STATUS                   — imprime status do sensor e contagem de templates
//
// Fluxo MQTT automático:
//   Recebe: enrollment/{TERMINAL_ID}/start → executa enrollment completo
//   Publica: enrollment/{TERMINAL_ID}/result → template + status
// =============================================================================

#include <Adafruit_Fingerprint.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

// -----------------------------------------------------------------------------
// Configuração — editar antes de carregar
// -----------------------------------------------------------------------------

const char* WIFI_SSID     = "Miguel";
const char* WIFI_PASSWORD = "Mmh020516";
const char* MQTT_SERVER   = "192.168.X.X";   // IP do computador com o broker
const int   MQTT_PORT     = 1883;
const char* TERMINAL_ID   = "enrollment-terminal-01";

// Baudrates a tentar na inicialização do sensor (em ordem de probabilidade)
const uint32_t SENSOR_BAUDRATES[] = { 57600, 9600, 19200, 38400, 115200 };
const int      SENSOR_BAUDRATE_COUNT = 5;

// Slot do ZN-53X usado nos testes de download/matching (Passos 5 e 6)
const uint16_t TEST_SLOT = 5;

// Timeout para captura de dedo (ms)
const unsigned long FINGER_TIMEOUT_MS = 30000;

// Pinos dos LEDs de feedback (opcional — comentar se não usar)
const int PIN_LED_RED   = 25;
const int PIN_LED_GREEN = 26;
const int PIN_LED_BLUE  = 27;

// -----------------------------------------------------------------------------
// Tópicos MQTT
// -----------------------------------------------------------------------------

// Buffer para montar tópicos dinamicamente
char topicEnrollStart[64];
char topicEnrollResult[64];

// -----------------------------------------------------------------------------
// Objetos globais
// -----------------------------------------------------------------------------

HardwareSerial sensorSerial(2);          // UART2: GPIO16 (RX2), GPIO17 (TX2)
Adafruit_Fingerprint finger(&sensorSerial);

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// Estado do enrollment em andamento (recebido via MQTT)
struct EnrollmentContext {
  bool     active       = false;
  char     enrollmentId[64];
  char     userId[64];
  char     fingerKey[32];
  uint32_t expiresAt    = 0;
};
EnrollmentContext currentEnrollment;

// Template extraído em memória (256 bytes)
uint8_t  templateBuffer[256];
uint16_t templateSize = 0;

// Último baudrate que funcionou
uint32_t activeBaudrate = 0;

// -----------------------------------------------------------------------------
// Utilitários
// -----------------------------------------------------------------------------

void ledOff() {
  digitalWrite(PIN_LED_RED,   LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_BLUE,  LOW);
}

void ledRed()   { ledOff(); digitalWrite(PIN_LED_RED,   HIGH); }
void ledGreen() { ledOff(); digitalWrite(PIN_LED_GREEN, HIGH); }
void ledBlue()  { ledOff(); digitalWrite(PIN_LED_BLUE,  HIGH); }

void ledBlink(int pin, int times, int delayMs = 150) {
  for (int i = 0; i < times; i++) {
    ledOff();
    digitalWrite(pin, HIGH);
    delay(delayMs);
    ledOff();
    delay(delayMs);
  }
}

// Converte buffer de bytes em string hex lowercase
void bytesToHex(const uint8_t* buf, uint16_t len, char* out) {
  for (uint16_t i = 0; i < len; i++) {
    sprintf(out + (i * 2), "%02x", buf[i]);
  }
  out[len * 2] = '\0';
}

// Converte string hex em buffer de bytes
// Retorna número de bytes convertidos (0 = erro)
uint16_t hexToBytes(const char* hex, uint8_t* out, uint16_t maxLen) {
  uint16_t hexLen = strlen(hex);
  if (hexLen % 2 != 0) return 0;
  uint16_t byteLen = hexLen / 2;
  if (byteLen > maxLen) return 0;
  for (uint16_t i = 0; i < byteLen; i++) {
    char byteStr[3] = { hex[i * 2], hex[i * 2 + 1], '\0' };
    out[i] = (uint8_t)strtol(byteStr, nullptr, 16);
  }
  return byteLen;
}

// -----------------------------------------------------------------------------
// Sensor — Inicialização
// -----------------------------------------------------------------------------

bool initSensor() {
  for (int i = 0; i < SENSOR_BAUDRATE_COUNT; i++) {
    uint32_t baud = SENSOR_BAUDRATES[i];
    Serial.printf("[SENSOR] Tentando conectar ao ZN-53X em %lu baud...\n", baud);

    sensorSerial.begin(baud, SERIAL_8N1, 16, 17);  // RX2=GPIO16, TX2=GPIO17
    finger.begin(baud);
    delay(200);

    if (finger.verifyPassword()) {
      activeBaudrate = baud;
      Serial.printf("[SENSOR] ✓ ZN-53X encontrado e respondendo em %lu baud!\n", baud);

      finger.getParameters();
      Serial.printf("[SENSOR] Capacidade: %d templates\n",   finger.capacity);
      Serial.printf("[SENSOR] Nível de segurança: %d\n",     finger.security_level);
      Serial.printf("[SENSOR] Tamanho do pacote: %d bytes\n", finger.packet_len);
      Serial.printf("[SENSOR] Baudrate registrado: %lu\n",   finger.baud_rate);

      finger.getTemplateCount();
      Serial.printf("[SENSOR] Templates atualmente armazenados: %d\n", finger.templateCount);

      return true;
    }

    sensorSerial.end();
    delay(100);
  }

  Serial.println("[SENSOR] ✗ Sensor não encontrado em nenhum baudrate.");
  Serial.println("[SENSOR]   Verificar: fiação TX/RX, tensão VCC, GND compartilhado.");
  return false;
}

// -----------------------------------------------------------------------------
// Sensor — Captura e geração de template
// -----------------------------------------------------------------------------

// Aguarda o dedo ser posicionado no sensor até timeout
// Retorna FINGERPRINT_OK ou FINGERPRINT_TIMEOUT
uint8_t waitForFinger(unsigned long timeoutMs) {
  unsigned long start = millis();
  uint8_t result;
  do {
    result = finger.getImage();
    if (result == FINGERPRINT_OK) return FINGERPRINT_OK;
    if (result != FINGERPRINT_NOFINGER) return result;
    delay(50);
  } while (millis() - start < timeoutMs);
  return FINGERPRINT_TIMEOUT;
}

// Aguarda o dedo ser retirado do sensor
void waitForFingerRemoval() {
  Serial.println("[ENROLL] Retire o dedo...");
  delay(500);
  while (finger.getImage() != FINGERPRINT_NOFINGER) {
    delay(100);
  }
  Serial.println("[ENROLL] Dedo removido ✓");
  delay(200);
}

// Executa enrollment completo (2 capturas → template em buffer)
// Retorna FINGERPRINT_OK em sucesso
uint8_t doEnroll() {
  uint8_t result;

  // --- 1ª passagem ---
  Serial.println("[ENROLL] 1ª passagem — passe o dedo no sensor...");
  ledBlue();

  result = waitForFinger(FINGER_TIMEOUT_MS);
  if (result == FINGERPRINT_TIMEOUT) {
    Serial.println("[ENROLL] ✗ Timeout aguardando 1ª passagem.");
    ledRed();
    return FINGERPRINT_TIMEOUT;
  }
  if (result != FINGERPRINT_OK) {
    Serial.printf("[ENROLL] ✗ Erro na captura da 1ª imagem: 0x%02X\n", result);
    ledRed();
    return result;
  }
  Serial.println("[ENROLL] 1ª captura: imagem obtida ✓");

  result = finger.image2Tz(1);
  if (result != FINGERPRINT_OK) {
    Serial.printf("[ENROLL] ✗ Erro ao extrair vetor da 1ª imagem: 0x%02X\n", result);
    printImageError(result);
    ledRed();
    return result;
  }
  Serial.println("[ENROLL] 1ª captura: vetor extraído ✓");

  waitForFingerRemoval();

  // --- 2ª passagem ---
  Serial.println("[ENROLL] 2ª passagem — passe o mesmo dedo novamente...");
  ledBlue();

  result = waitForFinger(FINGER_TIMEOUT_MS);
  if (result == FINGERPRINT_TIMEOUT) {
    Serial.println("[ENROLL] ✗ Timeout aguardando 2ª passagem.");
    ledRed();
    return FINGERPRINT_TIMEOUT;
  }
  if (result != FINGERPRINT_OK) {
    Serial.printf("[ENROLL] ✗ Erro na captura da 2ª imagem: 0x%02X\n", result);
    ledRed();
    return result;
  }
  Serial.println("[ENROLL] 2ª captura: imagem obtida ✓");

  result = finger.image2Tz(2);
  if (result != FINGERPRINT_OK) {
    Serial.printf("[ENROLL] ✗ Erro ao extrair vetor da 2ª imagem: 0x%02X\n", result);
    printImageError(result);
    ledRed();
    return result;
  }
  Serial.println("[ENROLL] 2ª captura: vetor extraído ✓");

  // --- Combinar em template ---
  result = finger.createModel();
  if (result != FINGERPRINT_OK) {
    Serial.printf("[ENROLL] ✗ Erro ao gerar template (createModel): 0x%02X\n", result);
    if (result == FINGERPRINT_ENROLLMISMATCH) {
      Serial.println("[ENROLL]   As duas capturas são muito diferentes — usar o mesmo dedo, mesma posição.");
    }
    ledRed();
    return result;
  }
  Serial.println("[ENROLL] Template gerado com sucesso ✓");
  return FINGERPRINT_OK;
}

// Mensagens de erro amigáveis para erros de imagem
void printImageError(uint8_t code) {
  switch (code) {
    case FINGERPRINT_IMAGEMESS:
      Serial.println("[ERRO]   Imagem muito borrada — limpar o sensor, posicionar o dedo com firmeza.");
      break;
    case FINGERPRINT_FEATUREFAIL:
      Serial.println("[ERRO]   Poucos pontos característicos — centralizar o dedo sobre o sensor.");
      break;
    case FINGERPRINT_INVALIDIMAGE:
      Serial.println("[ERRO]   Imagem inválida — tentar novamente com o dedo seco e limpo.");
      break;
    default:
      break;
  }
}

// -----------------------------------------------------------------------------
// Sensor — Upload (extração do template para buffer)
// -----------------------------------------------------------------------------

// Extrai o template do CharBuffer 1 do sensor via UploadTemplate (0x08)
// Preenche templateBuffer e templateSize
// Retorna FINGERPRINT_OK em sucesso
uint8_t uploadTemplate() {
  // getModel() envia o comando e lê apenas o ACK inicial
  uint8_t result = finger.getModel();
  if (result != FINGERPRINT_OK) {
    Serial.printf("[UPLOAD] ✗ Sensor rejeitou comando UploadTemplate: 0x%02X\n", result);
    return result;
  }
  Serial.println("[UPLOAD] ACK recebido ✓ — lendo data packets...");

  // Ler os data packets manualmente até END data packet
  templateSize = 0;
  uint8_t packetNum = 0;

  while (true) {
    Adafruit_Fingerprint_Packet pkt(FINGERPRINT_DATAPACKET, 0, nullptr);
    uint8_t pktResult = finger.getStructuredPacket(&pkt, 3000);

    if (pktResult != FINGERPRINT_OK) {
      Serial.printf("[UPLOAD] ✗ Erro ao ler data packet %d: 0x%02X\n", packetNum + 1, pktResult);
      return pktResult;
    }

    // O tamanho do payload do pacote de dados é: pkt.length - 2 (descontando checksum)
    uint16_t dataLen = pkt.length - 2;
    if (templateSize + dataLen > 256) {
      Serial.println("[UPLOAD] ✗ Template excede 256 bytes — sensor incompatível?");
      return FINGERPRINT_BADPACKET;
    }

    memcpy(templateBuffer + templateSize, pkt.data, dataLen);
    templateSize += dataLen;
    packetNum++;

    Serial.printf("[UPLOAD] Pacote %d: %d bytes ✓", packetNum, dataLen);

    if (pkt.type == FINGERPRINT_ENDDATAPACKET) {
      Serial.println(" (END)");
      break;
    }
    Serial.println();
  }

  Serial.printf("[UPLOAD] Template completo: %d bytes ✓\n", templateSize);

  // Imprimir primeiros 16 bytes para diagnóstico
  Serial.print("[UPLOAD] Primeiros 16 bytes (hex): ");
  for (int i = 0; i < 16 && i < templateSize; i++) {
    Serial.printf("%02x", templateBuffer[i]);
    if (i % 2 == 1) Serial.print(" ");
  }
  Serial.println();

  // Imprimir string hex completa
  char hexStr[513];
  bytesToHex(templateBuffer, templateSize, hexStr);
  Serial.println("[UPLOAD] String hex completa (512 chars):");
  Serial.println(hexStr);

  return FINGERPRINT_OK;
}

// -----------------------------------------------------------------------------
// Sensor — Download (carrega template externo no sensor)
// -----------------------------------------------------------------------------

// Carrega um template de 256 bytes no CharBuffer 1 via DownloadTemplate (0x09)
// e depois armazena no slot indicado via StoreModel (0x06)
// Retorna FINGERPRINT_OK em sucesso
uint8_t downloadTemplate(const uint8_t* tmpl, uint16_t len, uint16_t slot) {
  if (len != 256) {
    Serial.printf("[DOWNLOAD] ✗ Tamanho inválido: %d bytes (esperado: 256)\n", len);
    return FINGERPRINT_BADPACKET;
  }

  // Enviar comando DownloadTemplate (0x09)
  uint8_t cmdData[] = { 0x09, 0x01 };  // 0x09 = DOWNLOAD, 0x01 = CharBuffer 1
  Adafruit_Fingerprint_Packet cmdPkt(FINGERPRINT_COMMANDPACKET, sizeof(cmdData), cmdData);
  finger.writeStructuredPacket(cmdPkt);

  // Ler ACK
  Adafruit_Fingerprint_Packet ackPkt(FINGERPRINT_ACKPACKET, 0, nullptr);
  if (finger.getStructuredPacket(&ackPkt) != FINGERPRINT_OK || ackPkt.data[0] != FINGERPRINT_OK) {
    Serial.printf("[DOWNLOAD] ✗ Sensor rejeitou DownloadTemplate: 0x%02X\n", ackPkt.data[0]);
    return FINGERPRINT_PACKETRECIEVEERR;
  }
  Serial.println("[DOWNLOAD] ACK de DownloadTemplate recebido ✓");

  // Enviar os 256 bytes em 4 pacotes de 64 bytes
  // Os 3 primeiros são DATAPACKET, o último é ENDDATAPACKET
  const uint16_t PACKET_DATA_SIZE = 64;
  int totalPackets = (len + PACKET_DATA_SIZE - 1) / PACKET_DATA_SIZE;

  for (int p = 0; p < totalPackets; p++) {
    uint16_t offset  = p * PACKET_DATA_SIZE;
    uint16_t pktLen  = min((uint16_t)PACKET_DATA_SIZE, (uint16_t)(len - offset));
    bool     isLast  = (p == totalPackets - 1);
    uint8_t  pktType = isLast ? FINGERPRINT_ENDDATAPACKET : FINGERPRINT_DATAPACKET;

    Adafruit_Fingerprint_Packet dataPkt(pktType, pktLen, (uint8_t*)(tmpl + offset));
    finger.writeStructuredPacket(dataPkt);

    Serial.printf("[DOWNLOAD] Enviando data packet %d/%d (%d bytes)%s ✓\n",
                  p + 1, totalPackets, pktLen, isLast ? " (END)" : "");
    delay(20);
  }

  // Pequena pausa para o sensor processar
  delay(200);

  // Armazenar no slot via StoreModel (0x06)
  Serial.printf("[STORE] Armazenando no slot %d...\n", slot);
  uint8_t storeResult = finger.storeModel(slot);
  if (storeResult != FINGERPRINT_OK) {
    Serial.printf("[STORE] ✗ Erro ao armazenar no slot %d: 0x%02X\n", slot, storeResult);
    if (storeResult == FINGERPRINT_BADLOCATION) {
      Serial.printf("[STORE]   Slot %d inválido. Capacidade máxima: %d\n", slot, finger.capacity);
    }
    return storeResult;
  }

  Serial.printf("[STORE] ✓ Template armazenado no slot %d\n", slot);
  return FINGERPRINT_OK;
}

// -----------------------------------------------------------------------------
// Sensor — Matching
// -----------------------------------------------------------------------------

uint8_t doSearch() {
  Serial.println("[SEARCH] Capturando imagem — passe o dedo...");
  ledBlue();

  uint8_t result = waitForFinger(FINGER_TIMEOUT_MS);
  if (result == FINGERPRINT_TIMEOUT) {
    Serial.println("[SEARCH] ✗ Timeout aguardando dedo.");
    ledRed();
    return FINGERPRINT_TIMEOUT;
  }
  if (result != FINGERPRINT_OK) {
    Serial.printf("[SEARCH] ✗ Erro ao capturar imagem: 0x%02X\n", result);
    ledRed();
    return result;
  }
  Serial.println("[SEARCH] Imagem capturada ✓");

  result = finger.image2Tz(1);
  if (result != FINGERPRINT_OK) {
    Serial.printf("[SEARCH] ✗ Erro ao extrair vetor: 0x%02X\n", result);
    printImageError(result);
    ledRed();
    return result;
  }
  Serial.println("[SEARCH] Vetor extraído ✓");

  Serial.println("[SEARCH] Executando fingerFastSearch()...");
  result = finger.fingerFastSearch();

  if (result == FINGERPRINT_OK) {
    Serial.println("[SEARCH] ✓ MATCH ENCONTRADO!");
    Serial.printf("[SEARCH]   slotId:     %d\n",  finger.fingerID);
    Serial.printf("[SEARCH]   confidence: %d\n", finger.confidence);
    if (finger.confidence < 50) {
      Serial.println("[SEARCH]   ⚠ Confidence abaixo de 50 — resultado pouco confiável.");
    }
    ledGreen();
  } else if (result == FINGERPRINT_NOTFOUND) {
    Serial.println("[SEARCH] ✗ Nenhum match encontrado.");
    Serial.println("[SEARCH]   Verificar se o template foi carregado corretamente (Passo 5).");
    Serial.println("[SEARCH]   Tentar posicionar o dedo no mesmo ângulo e pressão do enrollment.");
    ledRed();
  } else {
    Serial.printf("[SEARCH] ✗ Erro inesperado: 0x%02X\n", result);
    ledRed();
  }

  return result;
}

// -----------------------------------------------------------------------------
// MQTT — Publicação do resultado de enrollment
// -----------------------------------------------------------------------------

void publishEnrollmentResult(const char* enrollmentId, const char* userId,
                              const char* fingerKey, const char* status,
                              const char* templateHex, uint8_t quality) {
  StaticJsonDocument<1200> doc;
  doc["enrollmentId"] = enrollmentId;
  doc["userId"]       = userId;
  doc["finger"]       = fingerKey;
  doc["status"]       = status;       // "COMPLETED" | "FAILED" | "TIMEOUT"
  doc["quality"]      = quality;

  if (templateHex != nullptr && strlen(templateHex) > 0) {
    doc["template"] = templateHex;
  }

  char payload[1200];
  serializeJson(doc, payload, sizeof(payload));

  bool ok = mqtt.publish(topicEnrollResult, payload, false);
  Serial.printf("[MQTT] %s Publicando resultado em %s\n",
                ok ? "✓" : "✗", topicEnrollResult);
  if (!ok) {
    Serial.println("[MQTT]   Falha ao publicar — verificar tamanho do payload e conexão.");
  }
}

// -----------------------------------------------------------------------------
// MQTT — Callback de mensagens recebidas
// -----------------------------------------------------------------------------

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char msg[512];
  uint16_t copyLen = min((uint16_t)length, (uint16_t)(sizeof(msg) - 1));
  memcpy(msg, payload, copyLen);
  msg[copyLen] = '\0';

  Serial.printf("[MQTT] Mensagem recebida em %s\n", topic);
  Serial.printf("[MQTT] Payload: %s\n", msg);

  // enrollment/{TERMINAL_ID}/start
  if (strcmp(topic, topicEnrollStart) == 0) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, msg);
    if (err) {
      Serial.printf("[MQTT] ✗ JSON inválido: %s\n", err.c_str());
      return;
    }

    if (currentEnrollment.active) {
      Serial.println("[MQTT] ⚠ Enrollment já em andamento — ignorando novo comando.");
      return;
    }

    strlcpy(currentEnrollment.enrollmentId, doc["enrollmentId"] | "unknown", sizeof(currentEnrollment.enrollmentId));
    strlcpy(currentEnrollment.userId,       doc["userId"]       | "unknown", sizeof(currentEnrollment.userId));
    strlcpy(currentEnrollment.fingerKey,    doc["finger"]       | "unknown", sizeof(currentEnrollment.fingerKey));
    currentEnrollment.active = true;

    Serial.println("[MQTT] ✓ Comando de enrollment recebido!");
    Serial.printf("[MQTT]   enrollmentId: %s\n", currentEnrollment.enrollmentId);
    Serial.printf("[MQTT]   userId:       %s\n", currentEnrollment.userId);
    Serial.printf("[MQTT]   finger:       %s\n", currentEnrollment.fingerKey);
  }
}

// -----------------------------------------------------------------------------
// MQTT — Conexão e reconexão
// -----------------------------------------------------------------------------

bool mqttConnect() {
  char clientId[48];
  snprintf(clientId, sizeof(clientId), "enrollment-%s", TERMINAL_ID);

  Serial.printf("[MQTT] Conectando como %s...\n", clientId);
  if (mqtt.connect(clientId)) {
    Serial.println("[MQTT] ✓ Conectado!");
    mqtt.subscribe(topicEnrollStart);
    Serial.printf("[MQTT] Inscrito em: %s\n", topicEnrollStart);

    // Publicar registro do terminal
    StaticJsonDocument<128> regDoc;
    regDoc["terminalId"] = TERMINAL_ID;
    regDoc["role"]       = "enrollment-terminal";
    regDoc["firmware"]   = "0.1.0-test";

    char regPayload[128];
    serializeJson(regDoc, regPayload, sizeof(regPayload));

    char regTopic[64];
    snprintf(regTopic, sizeof(regTopic), "enrollment/%s/register", TERMINAL_ID);
    mqtt.publish(regTopic, regPayload);
    Serial.println("[MQTT] ✓ Registro publicado");

    return true;
  }

  Serial.printf("[MQTT] ✗ Falha (state=%d) — tentando novamente em 5s\n", mqtt.state());
  return false;
}

// -----------------------------------------------------------------------------
// Comandos via Serial Monitor
// -----------------------------------------------------------------------------

void handleSerialCommand(const String& cmd) {
  if (cmd == "STATUS") {
    Serial.println("\n=== STATUS DO SENSOR ===");
    if (activeBaudrate == 0) {
      Serial.println("[STATUS] Sensor não inicializado.");
      return;
    }
    finger.getParameters();
    finger.getTemplateCount();
    Serial.printf("[STATUS] Baudrate ativo: %lu\n",    activeBaudrate);
    Serial.printf("[STATUS] Capacidade: %d slots\n",   finger.capacity);
    Serial.printf("[STATUS] Segurança: nível %d\n",    finger.security_level);
    Serial.printf("[STATUS] Packet size: %d bytes\n",  finger.packet_len);
    Serial.printf("[STATUS] Templates armazenados: %d\n", finger.templateCount);
    Serial.println("========================\n");
    return;
  }

  if (cmd == "TEST_ENROLL") {
    Serial.println("\n=== PASSO 2+3: CAPTURA E EXTRAÇÃO LOCAL ===");
    uint8_t enrollResult = doEnroll();
    if (enrollResult != FINGERPRINT_OK) {
      Serial.printf("[TEST] ✗ Enrollment falhou: 0x%02X\n", enrollResult);
      return;
    }
    // Automaticamente já extrai o template
    Serial.println("\n--- Extraindo template (Passo 3) ---");
    uint8_t uploadResult = uploadTemplate();
    if (uploadResult == FINGERPRINT_OK) {
      Serial.println("[TEST] ✓ Passos 2 e 3 concluídos com sucesso.");
      ledGreen();
    } else {
      Serial.printf("[TEST] ✗ Extração falhou: 0x%02X\n", uploadResult);
      ledRed();
    }
    Serial.println("===========================================\n");
    return;
  }

  if (cmd == "TEST_UPLOAD") {
    Serial.println("\n=== PASSO 3: EXTRAÇÃO DO TEMPLATE ===");
    if (templateSize == 0) {
      Serial.println("[TEST] ✗ Nenhum template no CharBuffer — executar TEST_ENROLL primeiro.");
      return;
    }
    uint8_t result = uploadTemplate();
    if (result == FINGERPRINT_OK) {
      ledGreen();
    } else {
      ledRed();
    }
    Serial.println("=====================================\n");
    return;
  }

  if (cmd.startsWith("TEST_DOWNLOAD ")) {
    Serial.println("\n=== PASSO 5: DOWNLOAD DE TEMPLATE EXTERNO ===");
    String hexStr = cmd.substring(14);
    hexStr.trim();

    if (hexStr.length() != 512) {
      Serial.printf("[TEST] ✗ String hex inválida: %d chars (esperado: 512)\n", hexStr.length());
      Serial.println("[TEST]   Copiar a string de 512 chars impressa no Passo 3.");
      return;
    }

    uint8_t extTemplate[256];
    uint16_t converted = hexToBytes(hexStr.c_str(), extTemplate, 256);
    if (converted != 256) {
      Serial.println("[TEST] ✗ Erro ao converter hex para bytes.");
      return;
    }

    Serial.printf("[DOWNLOAD] Convertendo 512 chars hex → %d bytes ✓\n", converted);
    uint8_t result = downloadTemplate(extTemplate, 256, TEST_SLOT);
    if (result == FINGERPRINT_OK) {
      ledGreen();
      Serial.printf("[TEST] ✓ Passo 5 concluído — template no slot %d.\n", TEST_SLOT);
    } else {
      ledRed();
    }
    Serial.println("=============================================\n");
    return;
  }

  if (cmd == "TEST_SEARCH") {
    Serial.println("\n=== PASSO 6: MATCHING LOCAL ===");
    doSearch();
    Serial.println("===============================\n");
    return;
  }

  if (cmd == "TEST_CLEAR") {
    Serial.println("\n=== LIMPANDO MEMÓRIA DO SENSOR ===");
    Serial.println("[CLEAR] ⚠ Isso apagará TODOS os templates armazenados!");
    Serial.println("[CLEAR] Enviando emptyDatabase()...");
    uint8_t result = finger.emptyDatabase();
    if (result == FINGERPRINT_OK) {
      Serial.println("[CLEAR] ✓ Memória limpa.");
      templateSize = 0;
      ledGreen();
    } else {
      Serial.printf("[CLEAR] ✗ Falha: 0x%02X\n", result);
      ledRed();
    }
    Serial.println("==================================\n");
    return;
  }

  Serial.println("[SERIAL] Comandos disponíveis:");
  Serial.println("  STATUS                — status do sensor");
  Serial.println("  TEST_ENROLL           — Passos 2+3: captura e extração local");
  Serial.println("  TEST_UPLOAD           — Passo 3: re-extrai template do buffer");
  Serial.println("  TEST_DOWNLOAD <hex>   — Passo 5: carrega template externo no slot 5");
  Serial.println("  TEST_SEARCH           — Passo 6: matching local");
  Serial.println("  TEST_CLEAR            — apaga todos os templates do sensor");
}

// -----------------------------------------------------------------------------
// Fluxo de enrollment via MQTT (Passo 4)
// -----------------------------------------------------------------------------

void processEnrollmentFromMQTT() {
  if (!currentEnrollment.active) return;

  Serial.println("\n=== PASSO 4: ENROLLMENT VIA MQTT ===");
  Serial.printf("[ENROLL] userId: %s | finger: %s\n",
                currentEnrollment.userId, currentEnrollment.fingerKey);

  // Captura
  uint8_t enrollResult = doEnroll();
  if (enrollResult == FINGERPRINT_TIMEOUT) {
    publishEnrollmentResult(
      currentEnrollment.enrollmentId,
      currentEnrollment.userId,
      currentEnrollment.fingerKey,
      "TIMEOUT", nullptr, 0
    );
    currentEnrollment.active = false;
    return;
  }
  if (enrollResult != FINGERPRINT_OK) {
    publishEnrollmentResult(
      currentEnrollment.enrollmentId,
      currentEnrollment.userId,
      currentEnrollment.fingerKey,
      "FAILED", nullptr, 0
    );
    currentEnrollment.active = false;
    ledRed();
    return;
  }

  // Extração
  uint8_t uploadResult = uploadTemplate();
  if (uploadResult != FINGERPRINT_OK || templateSize != 256) {
    publishEnrollmentResult(
      currentEnrollment.enrollmentId,
      currentEnrollment.userId,
      currentEnrollment.fingerKey,
      "FAILED", nullptr, 0
    );
    currentEnrollment.active = false;
    ledRed();
    return;
  }

  // Converter para hex e publicar
  char hexStr[513];
  bytesToHex(templateBuffer, templateSize, hexStr);

  // Qualidade baseada no confidence — não disponível após createModel diretamente.
  // Usar valor fixo de referência; em produção, capturar após fingerFastSearch de validação.
  uint8_t quality = 80;

  publishEnrollmentResult(
    currentEnrollment.enrollmentId,
    currentEnrollment.userId,
    currentEnrollment.fingerKey,
    "COMPLETED", hexStr, quality
  );

  ledGreen();
  Serial.println("[ENROLL] ✓ Enrollment concluído e resultado publicado.");
  Serial.println("=====================================\n");

  currentEnrollment.active = false;
}

// -----------------------------------------------------------------------------
// Setup
// -----------------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=======================================================");
  Serial.println("  Terminal de Enrollment Biométrico — ESP32S + ZN-53X");
  Serial.println("  Firmware de Teste v0.1.0");
  Serial.println("=======================================================\n");

  // Configurar LEDs
  pinMode(PIN_LED_RED,   OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE,  OUTPUT);
  ledOff();

  // Montar tópicos MQTT
  snprintf(topicEnrollStart,  sizeof(topicEnrollStart),  "enrollment/%s/start",  TERMINAL_ID);
  snprintf(topicEnrollResult, sizeof(topicEnrollResult), "enrollment/%s/result", TERMINAL_ID);

  // Inicializar sensor
  bool sensorOk = initSensor();
  if (!sensorOk) {
    ledRed();
    Serial.println("[BOOT] ✗ Sensor não inicializado. Corrigir fiação e reiniciar.");
    Serial.println("[BOOT]   Comandos de sensor não estarão disponíveis.");
    // Continua para permitir uso do Wi-Fi/MQTT de diagnóstico
  }

  // Conectar Wi-Fi
  Serial.printf("[WIFI] Conectando a %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 30) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] ✓ Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] ✗ Falha ao conectar. Verificar SSID e senha.");
    Serial.println("[WIFI]   Fluxo MQTT não disponível — modo local ativo.");
    Serial.println("[WIFI]   Comandos via Serial Monitor ainda funcionam.");
    ledRed();
  }

  // Conectar MQTT
  if (WiFi.status() == WL_CONNECTED) {
    mqtt.setServer(MQTT_SERVER, MQTT_PORT);
    mqtt.setCallback(mqttCallback);
    mqtt.setBufferSize(1300);  // Necessário para payload de template (>1024 bytes)
    mqttConnect();
  }

  Serial.println("\n[BOOT] ✓ Inicialização concluída.");
  Serial.println("[BOOT] Aguardando comandos via Serial Monitor ou MQTT...");
  Serial.println("[BOOT] Digite HELP no Serial Monitor para ver os comandos.\n");
}

// -----------------------------------------------------------------------------
// Loop
// -----------------------------------------------------------------------------

void loop() {
  // Manter conexão MQTT
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) {
      static unsigned long lastMqttRetry = 0;
      if (millis() - lastMqttRetry > 5000) {
        lastMqttRetry = millis();
        mqttConnect();
      }
    }
    mqtt.loop();
  }

  // Processar enrollment recebido via MQTT
  if (currentEnrollment.active) {
    processEnrollmentFromMQTT();
  }

  // Processar comandos do Serial Monitor
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) {
      handleSerialCommand(cmd);
    }
  }

  delay(10);
}
