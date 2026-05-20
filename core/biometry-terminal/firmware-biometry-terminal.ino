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
const unsigned long ACCESS_RESULT_TIMEOUT = 20000;
const unsigned long SYNC_TIMEOUT_MS       = 45000;
const unsigned long FINGER_DEBOUNCE_MS    = 3000;
const unsigned long ENROLLMENT_TIMEOUT_MS = 120000;

// Buffer MQTT para recepção de sync-template (templates até ~11KB = ~22KB hex + JSON).
// Durante enrollment o buffer é reduzido temporariamente para liberar heap.
const uint16_t MQTT_BUF_SIZE = 24576;

// Tamanho real do template do sensor (lido via PS_ReadSysPara durante setup).
// Usado para limitar os dados enviados via PS_DownChar.
uint16_t sensorTemplateSize = 0;  // 0 = ainda não lido
// Tamanho do pacote de dados do sensor (bytes reais de dados por pacote).
uint16_t sensorPacketDataSize = 128;  // default = 128 (observado nos logs de PS_UpChar)
// Baud rate real do sensor (detectado no setup).
uint32_t sensorBaudRate = 57600;

// ── Variáveis de estado ───────────────────────────────────────────────────────

char controllerId[48];

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

enum State { IDLE, WAITING_RESULT, ENROLLMENT_MODE, WAITING_SYNC };
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
String resultCredentialId = "";
bool   pendingCacheStore  = false;

// Forward declarations for globals defined later in the sketch.
extern WiFiClient espClient;
extern PubSubClient mqtt;
extern SoftwareSerial fingerSerial;
extern Adafruit_Fingerprint finger;
extern String topicEnrollmentResult;
extern String topicEnrollmentProgress;

// ── Slot table (maps sensor flash slots to credential IDs) ──────────────
// Reserve slot (capacity-1) for scratch during enrollment.
// Remaining slots are used for caching authorized fingerprints.

#define MAX_CACHE_SLOTS 49

struct SlotEntry {
  bool occupied;
  char credentialId[38]; // UUID (36) + null + pad
  uint32_t lastUsed;     // Unix timestamp (seconds)
};

SlotEntry slotTable[MAX_CACHE_SLOTS];

void loadSlotTable() {
  memset(slotTable, 0, sizeof(slotTable));
  if (!LittleFS.exists("/slots.dat")) return;
  File f = LittleFS.open("/slots.dat", "r");
  if (!f) return;
  for (int i = 0; i < MAX_CACHE_SLOTS && f.available(); i++) {
    String line = f.readStringUntil('\n');
    if (line.length() < 3) continue;
    int sep1 = line.indexOf(':');
    int sep2 = line.indexOf(':', sep1 + 1);
    if (sep1 < 0 || sep2 < 0) continue;
    int slot = line.substring(0, sep1).toInt();
    String cid = line.substring(sep1 + 1, sep2);
    uint32_t lu = strtoul(line.substring(sep2 + 1).c_str(), NULL, 10);
    if (slot >= 0 && slot < MAX_CACHE_SLOTS) {
      slotTable[slot].occupied = true;
      strncpy(slotTable[slot].credentialId, cid.c_str(), 37);
      slotTable[slot].credentialId[37] = '\0';
      slotTable[slot].lastUsed = lu;
    }
  }
  f.close();
#ifdef DEBUG
  int count = 0;
  for (int i = 0; i < MAX_CACHE_SLOTS; i++) if (slotTable[i].occupied) count++;
  Serial.print(F("[SLOT] Carregados: ")); Serial.println(count);
#endif
}

void saveSlotTable() {
  File f = LittleFS.open("/slots.dat", "w");
  if (!f) return;
  for (int i = 0; i < MAX_CACHE_SLOTS; i++) {
    if (slotTable[i].occupied) {
      f.print(i); f.print(':');
      f.print(slotTable[i].credentialId); f.print(':');
      f.println(slotTable[i].lastUsed);
    }
  }
  f.close();
}

int findFreeSlot() {
  for (int i = 0; i < MAX_CACHE_SLOTS; i++) {
    if (!slotTable[i].occupied) return i;
  }
  return -1; // full
}

int findLruSlot() {
  int oldest = -1;
  uint32_t oldestTime = UINT32_MAX;
  for (int i = 0; i < MAX_CACHE_SLOTS; i++) {
    if (slotTable[i].occupied && slotTable[i].lastUsed < oldestTime) {
      oldestTime = slotTable[i].lastUsed;
      oldest = i;
    }
  }
  return oldest;
}

void cacheCurrentTemplate(const String &credId) {
  // Find a free slot or evict LRU.
  int slot = findFreeSlot();
  if (slot < 0) {
    slot = findLruSlot();
    if (slot < 0) return; // shouldn't happen
    finger.deleteModel(slot);
#ifdef DEBUG
    Serial.print(F("[SLOT] LRU evict slot ")); Serial.println(slot);
#endif
  }
  if (finger.storeModel(slot) == FINGERPRINT_OK) {
    slotTable[slot].occupied = true;
    strncpy(slotTable[slot].credentialId, credId.c_str(), 37);
    slotTable[slot].credentialId[37] = '\0';
    slotTable[slot].lastUsed = millis() / 1000;
    saveSlotTable();
#ifdef DEBUG
    Serial.print(F("[SLOT] Cached cred ")); Serial.print(credId);
    Serial.print(F(" -> slot ")); Serial.println(slot);
#endif
  }
}


constexpr uint8_t TEMPLATE_EMPTY_CODE = 35;
constexpr size_t MAX_TEMPLATE_HEX_CHARS = 32768;

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
  uint8_t packetResult = finger.getStructuredPacket(&responsePacket, 500);
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

// ── PS_DownChar: download template from host to sensor ───────────────────────

uint8_t hexNibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return 10 + c - 'a';
  if (c >= 'A' && c <= 'F') return 10 + c - 'A';
  return 0;
}

// Sends a hex-encoded template to the sensor's character buffer via PS_DownChar.
// The template stays in buffer `bufferId` until storeModel() persists it.
bool downloadTemplateToSensor(const char* hexStr, size_t hexLen, uint8_t bufferId) {
  // O sensor ZW101 pode resetar o encryption level após certas operações.
  // PS_DownChar/PS_UpChar exigem encryption level 0, senão retornam erro.
  writeEncryptionLevelRaw(0);
  delay(50);

  clearFingerprintSerialInput();
  delay(20);

  size_t binaryLen = hexLen / 2;

  // Usa o TempSize real do sensor (lido no setup via PS_ReadSysPara).
  // Se sensorTemplateSize > 0, limita os dados ao tamanho real do character buffer.
  // Se = 0 (sensor não reportou), envia tudo.
  if (sensorTemplateSize > 0 && binaryLen > sensorTemplateSize) {
    binaryLen = sensorTemplateSize;
  }

  // Tamanho do chunk = tamanho de pacote configurado no sensor
  const size_t CHUNK = sensorPacketDataSize;

#ifdef DEBUG
  Serial.print(F("[SYNC] PS_DownChar buf=")); Serial.print(bufferId);
  Serial.print(F(" bytes=")); Serial.print(binaryLen);
  Serial.print(F(" chunk=")); Serial.println(CHUNK);
#endif

  // 1. Send PS_DownChar command (0x09)
  uint8_t cmdData[] = {0x09, bufferId};
  Adafruit_Fingerprint_Packet cmdPkt(FINGERPRINT_COMMANDPACKET, sizeof(cmdData), cmdData);
  finger.writeStructuredPacket(cmdPkt);

  // 2. Wait for command ACK
  uint8_t respBuf[64] = {0};
  Adafruit_Fingerprint_Packet respPkt(FINGERPRINT_ACKPACKET, 0, respBuf);
  uint8_t pktResult = finger.getStructuredPacket(&respPkt, 2000);
  if (pktResult != FINGERPRINT_OK) {
#ifdef DEBUG
    Serial.print(F("[SYNC] PS_DownChar sem resposta (pktResult=0x"));
    Serial.print(pktResult, HEX);
    Serial.println(F(")"));
#endif
    return false;
  }
  if (respPkt.data[0] != FINGERPRINT_OK) {
#ifdef DEBUG
    Serial.print(F("[SYNC] PS_DownChar rejeitado (code=0x"));
    Serial.print(respPkt.data[0], HEX);
    Serial.println(F(")"));
#endif
    return false;
  }

#ifdef DEBUG
  Serial.println(F("[SYNC] PS_DownChar ACK OK, enviando dados..."));
#endif

  // 3. Stream data packets using the sensor's configured packet size
  uint8_t pktBuf[256];  // max packet data is 256 bytes
  size_t sent = 0;

  while (sent < binaryLen) {
    size_t remain = binaryLen - sent;
    size_t chunkLen = (remain > CHUNK) ? CHUNK : remain;
    bool isLast = (sent + chunkLen >= binaryLen);

    for (size_t i = 0; i < chunkLen; i++) {
      size_t hi = (sent + i) * 2;
      pktBuf[i] = (hexNibble(hexStr[hi]) << 4) | hexNibble(hexStr[hi + 1]);
    }

    uint8_t ptype = isLast ? FINGERPRINT_ENDDATAPACKET : FINGERPRINT_DATAPACKET;
    Adafruit_Fingerprint_Packet dataPkt(ptype, chunkLen, pktBuf);
    finger.writeStructuredPacket(dataPkt);
    delay(5);

    sent += chunkLen;
  }

  // 4. Aguarda o sensor processar e despeja bytes pendentes para diagnóstico
  delay(300);

#ifdef DEBUG
  int avail = fingerSerial.available();
  if (avail > 0) {
    Serial.print(F("[SYNC] Sensor enviou ")); Serial.print(avail);
    Serial.print(F(" bytes pós-stream: "));
    int maxDump = (avail > 40) ? 40 : avail;
    for (int i = 0; i < maxDump; i++) {
      uint8_t b = fingerSerial.read();
      if (b < 0x10) Serial.print('0');
      Serial.print(b, HEX);
      Serial.print(' ');
    }
    Serial.println();
  } else {
    Serial.println(F("[SYNC] Nenhum byte do sensor pós-stream."));
  }
#endif

  // 5. Reinicializa SoftwareSerial para resetar o estado corrupto.
  //    Após centenas de writeStructuredPacket (que desabilita interrupts),
  //    o SoftwareSerial fica instável e comandos subsequentes falham (0x01).
  fingerSerial.end();
  delay(50);
  fingerSerial.begin(sensorBaudRate);
  delay(100);
  clearFingerprintSerialInput();

  return true;
}

// ── Sync template handler (receives template from server, stores in sensor) ──

int findStrInBuf(const byte* buf, unsigned int bufLen, const char* needle) {
  size_t nLen = strlen(needle);
  if (nLen > bufLen) return -1;
  for (unsigned int i = 0; i <= bufLen - nLen; i++) {
    if (memcmp(buf + i, needle, nLen) == 0) return (int)i;
  }
  return -1;
}

uint8_t storeModelBuffer(uint8_t bufferId, uint16_t id) {
  clearFingerprintSerialInput();
  uint8_t commandData[] = {0x06, bufferId, (uint8_t)(id >> 8), (uint8_t)(id & 0xFF)};
  Adafruit_Fingerprint_Packet commandPacket(FINGERPRINT_COMMANDPACKET, sizeof(commandData), commandData);
  finger.writeStructuredPacket(commandPacket);
  uint8_t responseData[64] = {0};
  Adafruit_Fingerprint_Packet responsePacket(FINGERPRINT_ACKPACKET, 0, responseData);
  uint8_t result = finger.getStructuredPacket(&responsePacket, 5000);
  if (result != FINGERPRINT_OK) return result;
  return responsePacket.data[0];
}

void handleSyncTemplate(byte* payload, unsigned int length) {
#ifdef DEBUG
  Serial.print(F("[SYNC] Recebido sync-template, payload: "));
  Serial.print(length);
  Serial.println(F(" bytes"));
#endif
  // Parse credentialId from raw payload (avoid large ArduinoJson alloc)
  int cidPos = findStrInBuf(payload, length, "\"credentialId\":\"");
  if (cidPos < 0) return;
  cidPos += 16; // skip key
  int cidEnd = -1;
  for (unsigned int i = cidPos; i < length; i++) {
    if (payload[i] == '"') { cidEnd = i; break; }
  }
  if (cidEnd < 0 || (cidEnd - cidPos) > 37) return;

  char credId[38];
  memcpy(credId, payload + cidPos, cidEnd - cidPos);
  credId[cidEnd - cidPos] = '\0';

  // Skip if already cached
  for (int i = 0; i < MAX_CACHE_SLOTS; i++) {
    if (slotTable[i].occupied && strcmp(slotTable[i].credentialId, credId) == 0) {
#ifdef DEBUG
      Serial.print(F("[SYNC] Já em cache: ")); Serial.println(credId);
#endif
      return;
    }
  }

  // Find template hex string
  int tplPos = findStrInBuf(payload, length, "\"template\":\"");
  if (tplPos < 0) return;
  tplPos += 12; // skip key
  int tplEnd = -1;
  for (unsigned int i = tplPos; i < length; i++) {
    if (payload[i] == '"') { tplEnd = i; break; }
  }
  if (tplEnd < 0) return;

  size_t hexLen = tplEnd - tplPos;
#ifdef DEBUG
  Serial.print(F("[SYNC] credId=")); Serial.print(credId);
  Serial.print(F(" hexLen=")); Serial.print(hexLen);
  Serial.print(F(" (")); Serial.print(hexLen / 2); Serial.println(F(" bytes)"));
#endif
  if (hexLen < 512 || hexLen > MAX_TEMPLATE_HEX_CHARS) {
#ifdef DEBUG
    Serial.println(F("[SYNC] Template fora dos limites, ignorando"));
#endif
    return;
  }

  const char* hexStr = (const char*)(payload + tplPos);

  // Download to buffer 1 e usar finger.storeModel() (da biblioteca Adafruit)
  // que sabemos que funciona (é o mesmo código usado no enrollment).
  // Buffer 1 será sobrescrito, mas re-capturamos a imagem no sync-complete.
  if (!downloadTemplateToSensor(hexStr, hexLen, 1)) {
#ifdef DEBUG
    Serial.println(F("[SYNC] Download para sensor falhou"));
#endif
    return;
  }

  // Store in free/LRU slot
  int slot = findFreeSlot();
  if (slot < 0) {
    slot = findLruSlot();
    if (slot < 0) return;
    finger.deleteModel(slot);
#ifdef DEBUG
    Serial.print(F("[SYNC] LRU evict slot ")); Serial.println(slot);
#endif
  }

  // Usa finger.storeModel() da biblioteca Adafruit (armazena buffer 1 → flash).
  // NOTA: Após PS_DownChar streaming, a serial pode estar corrompida e
  // storeModel pode retornar 0x01 (falso negativo — template foi armazenado
  // no sensor mas a resposta veio corrompida). Sempre atualizamos slotTable
  // porque fingerSearch não encontrará templates que realmente não existem.
  uint8_t storeResult = finger.storeModel(slot);
#ifdef DEBUG
  Serial.print(F("[SYNC] storeModel code=0x"));
  Serial.print(storeResult, HEX);
  Serial.print(F(" slot=")); Serial.println(slot);
#endif

  // Atualiza slotTable independentemente do resultado (pode ser falso negativo)
  slotTable[slot].occupied = true;
  strncpy(slotTable[slot].credentialId, credId, 37);
  slotTable[slot].credentialId[37] = '\0';
  slotTable[slot].lastUsed = millis() / 1000;
  saveSlotTable();
#ifdef DEBUG
  Serial.print(F("[SYNC] Slot ")); Serial.print(slot);
  Serial.print(F(" <- ")); Serial.println(credId);
#endif
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
    mqtt.subscribe(topicSyncTemplate.c_str());
    mqtt.subscribe(topicSyncComplete.c_str());
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

void publishDoorStatus() {
  StaticJsonDocument<128> doc;
  doc["doorState"] = (currentDoorState == OPEN) ? "OPEN" : ((currentDoorState == LOCKED) ? "LOCKED" : "UNKNOWN");
  doc["isLocked"]  = (currentDoorState == LOCKED);

  String p; serializeJson(doc, p);
  mqtt.publish(topicStatus.c_str(), p.c_str());
#ifdef DEBUG
  Serial.print(F("[Porta] Status publicado: "));
  Serial.println(currentDoorState == OPEN ? F("ABERTO") : F("FECHADO"));
#endif
}

void publishRequestSync() {
  StaticJsonDocument<128> doc;
  doc["deviceSecret"] = DEVICE_SECRET;
  String p; serializeJson(doc, p);
  bool ok = mqtt.publish(topicRequestSync.c_str(), p.c_str());

#ifdef DEBUG
  Serial.print(F("[BIO] Request-sync enviado (ok="));
  Serial.print(ok);
  Serial.print(F(") t="));
  Serial.println(millis());
#endif
}

void publishLocalMatch(int slotId, const char* credentialId, uint16_t confidence) {
  StaticJsonDocument<256> doc;
  doc["credentialId"] = credentialId;
  doc["confidence"]   = confidence;
  doc["slotId"]       = slotId;
  doc["deviceSecret"] = DEVICE_SECRET;
  String p; serializeJson(doc, p);
  mqtt.publish(topicLocalMatch.c_str(), p.c_str());
#ifdef DEBUG
  Serial.print(F("[BIO] Local match slot ")); Serial.print(slotId);
  Serial.print(F(" conf=")); Serial.println(confidence);
#endif
}

// =============================================================================
//  CALLBACK MQTT
// =============================================================================

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String t = String(topic);

  // access-result
  if (t == topicAccessResult) {
    StaticJsonDocument<384> doc;
    if (deserializeJson(doc, payload, length)) return;
    const char* status = doc["status"];
    if (!status) return;
    resultStatus   = String(status);
    resultReceived = true;
    // Parse credentialId for caching on GRANTED
    const char* credId = doc["credentialId"] | "";
    if (resultStatus == "GRANTED" && strlen(credId) > 0) {
      resultCredentialId = String(credId);
      pendingCacheStore = true;
    } else {
      resultCredentialId = "";
      pendingCacheStore = false;
    }
#ifdef DEBUG
    Serial.print(F("[MQTT] Result: ")); Serial.println(resultStatus);
    if (pendingCacheStore) {
      Serial.print(F("[MQTT] credentialId for cache: ")); Serial.println(resultCredentialId);
    }
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

  // sync-template (server pushes templates for local caching)
  if (t == topicSyncTemplate) {
    handleSyncTemplate(payload, length);
    return;
  }

  // sync-complete (server finished pushing templates)
  if (t == topicSyncComplete) {
#ifdef DEBUG
    Serial.print(F("[BIO] sync-complete recebido (state="));
    Serial.print(currentState);
    Serial.println(F(")"));
#endif
    if (currentState == WAITING_SYNC) {
#ifdef DEBUG
      Serial.println(F("[BIO] Sync concluído, re-capturando dedo..."));
#endif
      // Re-captura a imagem pois as operações de PS_DownChar (streaming
      // de templates grandes para buffer 2) podem corromper o Buffer 1.
      // O dedo provavelmente ainda está no sensor.
      if (finger.getImage() != FINGERPRINT_OK) {
#ifdef DEBUG
        Serial.println(F("[BIO] Dedo não detectado após sync. Acesso negado."));
#endif
        ledBlink(5, 50);
        currentState = IDLE;
        return;
      }
      if (finger.image2Tz(1) != FINGERPRINT_OK) {
#ifdef DEBUG
        Serial.println(F("[BIO] image2Tz falhou após sync."));
#endif
        ledBlink(5, 50);
        currentState = IDLE;
        return;
      }

      int searchResult = finger.fingerSearch();
#ifdef DEBUG
      Serial.print(F("[BIO] fingerSearch resultado=")); Serial.print(searchResult);
      Serial.print(F(" id=")); Serial.print(finger.fingerID);
      Serial.print(F(" conf=")); Serial.println(finger.confidence);
#endif
      if (searchResult == FINGERPRINT_OK && finger.fingerID < MAX_CACHE_SLOTS
          && slotTable[finger.fingerID].occupied) {
        // Match encontrado pós-sincronização
        publishLocalMatch(finger.fingerID, slotTable[finger.fingerID].credentialId, finger.confidence);
        slotTable[finger.fingerID].lastUsed = millis() / 1000;
        saveSlotTable();
        currentState = WAITING_RESULT;
        waitingResultAt = millis();
        lastFingerTime = millis();
      } else {
        // Definitivamente não tem acesso
#ifdef DEBUG
        Serial.print(F("[BIO] Sem match após sync. searchResult="));
        Serial.print(searchResult);
        if (searchResult == FINGERPRINT_OK) {
          Serial.print(F(" id=")); Serial.print(finger.fingerID);
          Serial.print(F(" idOK=")); Serial.print(finger.fingerID < MAX_CACHE_SLOTS);
          if (finger.fingerID < MAX_CACHE_SLOTS) {
            Serial.print(F(" occupied=")); Serial.print(slotTable[finger.fingerID].occupied);
            Serial.print(F(" cred=")); Serial.print(slotTable[finger.fingerID].credentialId);
          }
        }
        Serial.println();
#endif
        ledBlink(5, 50);
        currentState = IDLE;
      }
    }
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
      Serial.print(F("[BIO] Sensor biométrico encontrado a "));
      Serial.print(baudRates[i]);
      Serial.println(" baud!");
#endif
      sensorBaudRate = baudRates[i];
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
      Serial.print(F("[BIO] SysPara system_id (TempSize): ")); Serial.println(finger.system_id);
      Serial.print(F("[BIO] SysPara packet_len (CFG_PktSize): ")); Serial.println(finger.packet_len);
#endif
      // Decodifica TempSize: o campo system_id da Adafruit corresponde ao
      // registrador TempSize do AS608 (tamanho do character file em bytes).
      // Valor típico: 0 = sensor não reporta, caso contrário é o tamanho real.
      sensorTemplateSize = finger.system_id;
      // Decodifica packet_len: 0=32, 1=64, 2=128, 3=256
      // Se o sensor reporta 0 (32 bytes), provavelmente não suporta setPacketSize
      // e usa 128 bytes na prática (observado nos logs de PS_UpChar).
      if (finger.packet_len >= 1 && finger.packet_len <= 3) {
        sensorPacketDataSize = 32u << finger.packet_len;
      } else {
        sensorPacketDataSize = 128;  // default seguro baseado no comportamento real
      }
#ifdef DEBUG
      Serial.print(F("[BIO] Template real: ")); Serial.print(sensorTemplateSize); Serial.println(F(" bytes"));
      Serial.print(F("[BIO] Packet data: ")); Serial.print(sensorPacketDataSize); Serial.println(F(" bytes"));
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

      // Libera o buffer MQTT grande (24KB) para dar espaço ao template
      // hex na heap (pode chegar a ~22KB). Restaurado após o publish.
      mqtt.setBufferSize(512);

      if (enrollmentTemplateHex.length() == 0) {
        if (!captureTemplateHexFromSensor(enrollmentTemplateHex)) {
          publishEnrollmentProgress("FAILED");
          publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "FAILED", "", 0);
          mqtt.setBufferSize(MQTT_BUF_SIZE);
          resetEnrollmentState();
          return;
        }
      }

      enrollmentQuality = 0;
#ifdef DEBUG
      Serial.print(F("[MQTT] Heap antes do publish: ")); Serial.println(ESP.getFreeHeap());
#endif
      publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "SUCCESS", enrollmentTemplateHex, enrollmentQuality);
      mqtt.setBufferSize(MQTT_BUF_SIZE);

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
  topicLocalMatch = String("door/") + controllerId + "/local-match";
  topicSyncTemplate = String("door/") + controllerId + "/sync-template";
  topicRequestSync = String("door/") + controllerId + "/request-sync";
  topicSyncComplete = String("door/") + controllerId + "/sync-complete";

#ifdef DEBUG
  Serial.print(F("Controller ID: ")); Serial.println(controllerId);
  Serial.println(F("Inicializando..."));
#endif

  connectWifi();
  mqtt.setServer(MQTT_SERVER, atoi(MQTT_PORT));
  if (!mqtt.setBufferSize(MQTT_BUF_SIZE)) {
#ifdef DEBUG
    Serial.print(F("[MQTT] Falha ao alocar buffer de ")); Serial.print(MQTT_BUF_SIZE);
    Serial.print(F(" bytes. Heap livre: ")); Serial.println(ESP.getFreeHeap());
#endif
  }
  mqtt.setCallback(onMqttMessage);
  
  setupFingerprint();

  if (LittleFS.begin()) {
    loadSlotTable();
  }
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

  // --- Lógica de acesso biométrico (local-first) ---
  bool touched = digitalRead(PIN_TOUCHOUT) == HIGH;

  if (currentState == IDLE && touched) {
    if (millis() - lastFingerTime > FINGER_DEBOUNCE_MS) {
      if (finger.getImage() == FINGERPRINT_OK && finger.image2Tz(1) == FINGERPRINT_OK) {
        // 1. Tenta match local (sensor flash)
        int searchResult = finger.fingerSearch();
        if (searchResult == FINGERPRINT_OK && finger.fingerID < MAX_CACHE_SLOTS
            && slotTable[finger.fingerID].occupied) {
          // Match local encontrado — confirma permissão com o servidor
          publishLocalMatch(finger.fingerID, slotTable[finger.fingerID].credentialId, finger.confidence);
          // Atualiza LRU
          slotTable[finger.fingerID].lastUsed = millis() / 1000;
          saveSlotTable();
          currentState = WAITING_RESULT;
          waitingResultAt = millis();
          lastFingerTime = millis();
#ifdef DEBUG
          Serial.print(F("[BIO] Match local slot ")); Serial.print(finger.fingerID);
          Serial.print(F(" conf=")); Serial.println(finger.confidence);
#endif
        } else {
          // 2. Sem match local — pede os templates faltantes do servidor
#ifdef DEBUG
          Serial.println(F("[BIO] Sem match local, pedindo templates do servidor (sync)..."));
#endif
          // O dedo ainda está no sensor e o Buffer 1 contém as características (image2Tz(1))
          // que usaremos para comparar (fingerSearch) novamente quando o download terminar.
          publishRequestSync();
          currentState = WAITING_SYNC;
          waitingResultAt = millis();
          lastFingerTime = millis();
        }
      }
    }
  }

  if (currentState == WAITING_RESULT || currentState == WAITING_SYNC) {
    // Usa millis() fresco em vez de 'now' (capturado no topo do loop,
    // antes das operações UART bloqueantes que avançam o relógio).
    unsigned long elapsed = millis() - waitingResultAt;
    unsigned long timeout = (currentState == WAITING_SYNC) ? SYNC_TIMEOUT_MS : ACCESS_RESULT_TIMEOUT;
    if (elapsed > timeout) {
#ifdef DEBUG
      Serial.print(F("[BIO] Timeout (")); Serial.print(elapsed / 1000);
      Serial.print(F("s) state=")); Serial.println(currentState);
#endif
      ledBlink(3, 100);
      currentState = IDLE;
      resultReceived = false;
      pendingCacheStore = false;
    }
    // Recebeu retorno de WAITING_RESULT
    else if (currentState == WAITING_RESULT && resultReceived) {
      if (resultStatus == "GRANTED") {
        // Toggle door state (mesmo comportamento do terminal NFC)
        if (currentDoorState == OPEN) {
          currentDoorState = LOCKED;
        } else {
          currentDoorState = OPEN;
        }
#ifdef DEBUG
        Serial.print(F("[Porta] Novo estado: "));
        Serial.println(currentDoorState == OPEN ? F("ABERTO") : F("FECHADO"));
#endif
        publishDoorStatus();
        ledBlink(1, 1000);
        // Cache do template no sensor se veio de match remoto
        if (pendingCacheStore && resultCredentialId.length() > 0) {
          cacheCurrentTemplate(resultCredentialId);
        }
      } else {
        ledBlink(5, 50);
      }
      currentState = IDLE;
      resultReceived = false;
      pendingCacheStore = false;
      resultCredentialId = "";
    }
  }
}
