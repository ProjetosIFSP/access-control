#include "BiometryManager.h"
#include <HardwareSerial.h>
#include <Adafruit_Fingerprint.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

Adafruit_Fingerprint finger = Adafruit_Fingerprint(&Serial2);

const unsigned long FINGER_DEBOUNCE_MS = 3000;
unsigned long lastFingerTime = 0;

uint16_t sensorTemplateSize = 0;
uint16_t sensorPacketDataSize = 128;
uint32_t sensorBaudRate = 57600;

enum EnrollmentStep {
  ENROLL_STEP_IDLE,
  ENROLL_STEP_WAITING_FIRST,
  ENROLL_STEP_WAITING_SECOND,
  ENROLL_STEP_CREATE_MODEL
};

EnrollmentStep enrollmentStep = ENROLL_STEP_IDLE;
String enrollmentId = "";
String enrollmentUserId = "";
String enrollmentFinger = "";
uint8_t enrollmentQuality = 0;
unsigned long enrollmentExpiresAt = 0;
unsigned long enrollmentStepAt = 0;

#define MAX_CACHE_SLOTS 49

struct SlotEntry {
  bool occupied;
  char credentialId[38];
  uint32_t lastUsed;
};

SlotEntry slotTable[MAX_CACHE_SLOTS];

// -- Helpers e Cache --
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
  return -1;
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
  int slot = findFreeSlot();
  if (slot < 0) {
    slot = findLruSlot();
    if (slot < 0) return;
    finger.deleteModel(slot);
  }
  if (finger.storeModel(slot) == FINGERPRINT_OK) {
    slotTable[slot].occupied = true;
    strncpy(slotTable[slot].credentialId, credId.c_str(), 37);
    slotTable[slot].credentialId[37] = '\0';
    slotTable[slot].lastUsed = millis() / 1000;
    saveSlotTable();
  }
}

void evictSlot(int slot) {
  if (slot < 0 || slot >= MAX_CACHE_SLOTS) return;
  finger.deleteModel(slot);
  slotTable[slot].occupied = false;
  memset(slotTable[slot].credentialId, 0, sizeof(slotTable[slot].credentialId));
  saveSlotTable();
  Serial.print(F("[BIO] Slot ")); Serial.print(slot); Serial.println(F(" evictado do cache (removido)."));
}

int performFingerSearch() {
  int searchResult;
  while (true) {
    searchResult = finger.fingerSearch();
    if (searchResult == FINGERPRINT_OK) {
      if (finger.fingerID >= MAX_CACHE_SLOTS || !slotTable[finger.fingerID].occupied) {
        delay(50);
        finger.deleteModel(finger.fingerID);
        continue;
      }
    }
    break;
  }
  return searchResult;
}

// -- Comandos Raw (Serial limpo) --
void clearFingerprintSerialInput() {
  uint32_t lastRead = millis();
  while (millis() - lastRead < 30) {
    if (Serial2.available()) {
      Serial2.read();
      lastRead = millis();
    }
  }
}

uint8_t writeEncryptionLevelRaw(uint8_t level) {
  clearFingerprintSerialInput();
  uint8_t commandData[] = {FINGERPRINT_WRITE_REG, 0x07, level};
  Adafruit_Fingerprint_Packet commandPacket(FINGERPRINT_COMMANDPACKET, sizeof(commandData), commandData);
  finger.writeStructuredPacket(commandPacket);
  uint8_t responseData[64] = {0};
  Adafruit_Fingerprint_Packet responsePacket(FINGERPRINT_ACKPACKET, 0, responseData);
  uint8_t packetResult = finger.getStructuredPacket(&responsePacket, 500);
  if (packetResult != FINGERPRINT_OK) return packetResult;
  return responsePacket.data[0];
}

constexpr uint8_t TEMPLATE_EMPTY_CODE = 35;
constexpr size_t MAX_TEMPLATE_HEX_CHARS = 32768;

String bytesToHex(const uint8_t* data, size_t length) {
  if (length == 0) return "";
  char* buf = (char*)malloc(length * 2 + 1);
  if (!buf) return "";
  for (size_t i = 0; i < length; i++) {
    sprintf(buf + (i * 2), "%02x", data[i]);
  }
  buf[length * 2] = '\0';
  String hex(buf);
  free(buf);
  return hex;
}

bool captureTemplateHexFromSensor(File &file, int slotId) {
  Serial.println(F("[BIO-EXTRACTION] Iniciando extracao via RAM Buffer..."));

  if (slotId >= 0) {
    if (finger.loadModel(slotId) != FINGERPRINT_OK) {
      Serial.println(F("[BIO-EXTRACTION] Falha no loadModel."));
      return false;
    }
    delay(50);
  }

  size_t maxBufSize = 32768; // 32KB para o template inteiro
  uint8_t *rawBuffer = (uint8_t *)malloc(maxBufSize);
  if (!rawBuffer) {
    Serial.println(F("[BIO-EXTRACTION] Falha ao alocar RAM."));
    return false;
  }

  clearFingerprintSerialInput();

  // Envia comando FINGERPRINT_UPLOAD direto para o Buffer 1
  uint8_t cmd[] = {0xEF, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00, 0x0E};
  Serial2.write(cmd, 13);
  Serial2.flush();

  Serial.println(F("[BIO-EXTRACTION] Aguardando stream..."));

  uint32_t index = 0;
  uint32_t start = millis();
  bool receiving = false;

  // Escuta a porta serial em velocidade máxima
  while (index < maxBufSize) {
    if (Serial2.available()) {
      rawBuffer[index++] = Serial2.read();
      start = millis();
      receiving = true;
    } else {
      if (!receiving && (millis() - start > 1500)) {
        Serial.println(F("[BIO-EXTRACTION] Timeout aguardando inicio."));
        break;
      }
      if (receiving && (millis() - start > 200)) {
        // Silencio de 200ms apos inicio = fim da transmissao!
        break; 
      }
    }
  }

  Serial.print(F("[BIO-EXTRACTION] Bytes recebidos na RAM: ")); Serial.println(index);

  // Faz o parsing offline super seguro do que foi capturado na RAM
  bool success = false;
  uint32_t ptr = 0;
  uint32_t bytesWritten = 0;
  uint32_t parsedPackets = 0;
  
  while (ptr < index) {
    if (ptr + 9 > index) break; // Sem espaco para cabecalho completo
    
    // Procura assinatura de pacote EF 01
    if (rawBuffer[ptr] == 0xEF && rawBuffer[ptr+1] == 0x01) {
      uint8_t type = rawBuffer[ptr+6];
      uint16_t len = (rawBuffer[ptr+7] << 8) | rawBuffer[ptr+8];
      
      if (ptr + 9 + len > index) {
        ptr++; // Pacote cortado no final da RAM, tenta resincronizar
        continue;
      }
      
      // Tipo 0x02 = Data, Tipo 0x08 = End Data
      if (type == 0x02 || type == 0x08) {
        parsedPackets++;
        uint16_t dataLen = len - 2; // Desconta 2 bytes do checksum
        if (file.size() + (dataLen * 2) > MAX_TEMPLATE_HEX_CHARS) {
          Serial.println(F("[BIO-EXTRACTION] Template excedeu limite."));
          break;
        }
        
        String hexStr = bytesToHex(&rawBuffer[ptr+9], dataLen);
        bytesWritten += file.print(hexStr);
        
        if (type == 0x08) {
          success = true;
          break;
        }
      }
      ptr += (9 + len); // Pula para o proximo pacote
    } else {
      ptr++; // Avanca 1 byte buscando assinatura
    }
  }

  free(rawBuffer);

  if (!success) {
    Serial.println(F("[BIO-EXTRACTION] Falha ao extrair dados dos pacotes."));
    return false;
  }

  file.flush(); // Garante que tudo va para a flash do ESP32

  if (bytesWritten < 512) {
    Serial.print(F("[BIO-EXTRACTION] Arquivo muito pequeno: ")); Serial.println(bytesWritten);
    return false;
  }

  Serial.print(F("[BIO-EXTRACTION] Template extraido com sucesso! Pacotes: "));
  Serial.print(parsedPackets); Serial.print(F(" | Bytes gravados: ")); Serial.println(bytesWritten);
  return true;
}

// -- LED --
#define ZW_COLOR_OFF    0x00
#define ZW_COLOR_BLUE   0x01
#define ZW_COLOR_GREEN  0x02
#define ZW_COLOR_RED    0x04

#define ZW_MODE_BREATHING    0x01
#define ZW_MODE_FLASHING     0x02
#define ZW_MODE_ON           0x03
#define ZW_MODE_OFF          0x04

void sensorLedCmd(uint8_t mode, uint8_t startColor, uint8_t endColor, uint8_t cycles) {
  uint8_t data[] = {0x3C, mode, startColor, endColor, cycles};
  Adafruit_Fingerprint_Packet pkt(FINGERPRINT_COMMANDPACKET, sizeof(data), data);
  finger.writeStructuredPacket(pkt);
  uint8_t respBuf[64] = {0};
  Adafruit_Fingerprint_Packet resp(FINGERPRINT_ACKPACKET, 0, respBuf);
  finger.getStructuredPacket(&resp, 500);
}

void sensorLedOff() { sensorLedCmd(ZW_MODE_ON, ZW_COLOR_OFF, ZW_COLOR_OFF, 0); }
void sensorLedGreen(uint8_t count) { if (count > 0) sensorLedCmd(ZW_MODE_FLASHING, ZW_COLOR_GREEN, ZW_COLOR_GREEN, count); else sensorLedCmd(ZW_MODE_ON, ZW_COLOR_GREEN, ZW_COLOR_GREEN, 0); }
void sensorLedRed(uint8_t count) { if (count > 0) sensorLedCmd(ZW_MODE_FLASHING, ZW_COLOR_RED, ZW_COLOR_RED, count); else sensorLedCmd(ZW_MODE_ON, ZW_COLOR_RED, ZW_COLOR_RED, 0); }
void sensorLedBlue() { sensorLedCmd(ZW_MODE_BREATHING, ZW_COLOR_BLUE, ZW_COLOR_BLUE, 0); }

// -- Setup --
void setupBiometry() {
  pinMode(PIN_TOUCHOUT, INPUT);
  
  // Aumenta o buffer RX para suportar o stream de extração do hex
  Serial2.setRxBufferSize(1024);
  // ESP32: Serial2 nos pinos de RX e TX escolhidos
  Serial2.begin(57600, SERIAL_8N1, PIN_FINGER_RX, PIN_FINGER_TX);
  
  int baudRates[] = {57600, 9600, 115200, 19200};
  bool found = false;

  for (int i = 0; i < 4; i++) {
    finger.begin(baudRates[i]);
    delay(100);
    if (finger.verifyPassword()) {
      sensorBaudRate = baudRates[i];
      finger.getParameters();
      writeEncryptionLevelRaw(0);
      delay(100);
      finger.getParameters();
      if (finger.packet_len != FINGERPRINT_PACKET_SIZE_256) {
        finger.setPacketSize(FINGERPRINT_PACKET_SIZE_256);
        delay(150);
        finger.getParameters();
      }
      sensorTemplateSize = finger.system_id;
      if (finger.packet_len >= 1 && finger.packet_len <= 3) {
        sensorPacketDataSize = 32u << finger.packet_len;
      } else {
        sensorPacketDataSize = 128;
      }
      found = true;
      break;
    }
  }

  if (found) {
    sensorLedOff();
    Serial.println(F("[BIO] Sensor inicializado com sucesso no ESP32."));
  } else {
    Serial.println(F("[BIO] Falha ao inicializar o sensor."));
  }

  loadSlotTable();
}

uint8_t hexNibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return 10 + c - 'a';
  if (c >= 'A' && c <= 'F') return 10 + c - 'A';
  return 0;
}

bool downloadTemplateToSensor(const char* hexStr, size_t hexLen, uint8_t bufferId) {
  writeEncryptionLevelRaw(0);
  delay(50);
  clearFingerprintSerialInput();
  delay(20);

  size_t binaryLen = hexLen / 2;
  if (sensorTemplateSize > 0 && binaryLen > sensorTemplateSize) {
    binaryLen = sensorTemplateSize;
  }

  const size_t CHUNK = sensorPacketDataSize;

  uint8_t cmdData[] = {0x09, bufferId};
  Adafruit_Fingerprint_Packet cmdPkt(FINGERPRINT_COMMANDPACKET, sizeof(cmdData), cmdData);
  finger.writeStructuredPacket(cmdPkt);

  uint8_t respBuf[64] = {0};
  Adafruit_Fingerprint_Packet respPkt(FINGERPRINT_ACKPACKET, 0, respBuf);
  uint8_t pktResult = finger.getStructuredPacket(&respPkt, 2000);
  if (pktResult != FINGERPRINT_OK || respPkt.data[0] != FINGERPRINT_OK) return false;

  uint8_t pktBuf[256];
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
    delay(25);
    sent += chunkLen;
  }

  delay(300);

  Serial2.end();
  delay(50);
  Serial2.begin(sensorBaudRate, SERIAL_8N1, PIN_FINGER_RX, PIN_FINGER_TX);
  delay(100);
  clearFingerprintSerialInput();

  return true;
}

int findStrInBuf(const byte* buf, unsigned int bufLen, const char* needle) {
  size_t nLen = strlen(needle);
  if (nLen > bufLen) return -1;
  for (unsigned int i = 0; i <= bufLen - nLen; i++) {
    if (memcmp(buf + i, needle, nLen) == 0) return (int)i;
  }
  return -1;
}

void handleSyncTemplate(byte* payload, unsigned int length) {
  Serial.print(F("[SYNC] Recebido sync-template, payload: "));
  Serial.print(length);
  Serial.println(F(" bytes"));

  int cidPos = findStrInBuf(payload, length, "\"credentialId\":\"");
  if (cidPos < 0) return;
  cidPos += 16;
  int cidEnd = -1;
  for (unsigned int i = cidPos; i < length; i++) {
    if (payload[i] == '"') { cidEnd = i; break; }
  }
  if (cidEnd < 0 || (cidEnd - cidPos) > 37) return;

  char credId[38];
  memcpy(credId, payload + cidPos, cidEnd - cidPos);
  credId[cidEnd - cidPos] = '\0';

  for (int i = 0; i < MAX_CACHE_SLOTS; i++) {
    if (slotTable[i].occupied && strcmp(slotTable[i].credentialId, credId) == 0) {
      Serial.print(F("[SYNC] Já em cache: ")); Serial.println(credId);
      return;
    }
  }

  int tplPos = findStrInBuf(payload, length, "\"template\":\"");
  if (tplPos < 0) return;
  tplPos += 12;
  int tplEnd = -1;
  for (unsigned int i = tplPos; i < length; i++) {
    if (payload[i] == '"') { tplEnd = i; break; }
  }
  if (tplEnd < 0) return;

  size_t hexLen = tplEnd - tplPos;
  Serial.print(F("[SYNC] credId=")); Serial.print(credId);
  Serial.print(F(" hexLen=")); Serial.print(hexLen);
  Serial.print(F(" (")); Serial.print(hexLen / 2); Serial.println(F(" bytes)"));

  if (hexLen < 512 || hexLen > MAX_TEMPLATE_HEX_CHARS) {
    Serial.println(F("[SYNC] Template fora dos limites, ignorando"));
    return;
  }

  const char* hexStr = (const char*)(payload + tplPos);

  if (!downloadTemplateToSensor(hexStr, hexLen, 1)) {
    Serial.println(F("[SYNC] Download para sensor falhou"));
    return;
  }

  int slot = findFreeSlot();
  if (slot < 0) {
    slot = findLruSlot();
    if (slot < 0) return;
    finger.deleteModel(slot);
    Serial.print(F("[SYNC] LRU evict slot ")); Serial.println(slot);
  }

  uint8_t storeResult = finger.storeModel(slot);
  Serial.print(F("[SYNC] storeModel code=0x"));
  Serial.print(storeResult, HEX);
  Serial.print(F(" slot=")); Serial.println(slot);

  slotTable[slot].occupied = true;
  strncpy(slotTable[slot].credentialId, credId, 37);
  slotTable[slot].credentialId[37] = '\0';
  slotTable[slot].lastUsed = millis() / 1000;
  saveSlotTable();
  Serial.print(F("[SYNC] Slot ")); Serial.print(slot);
  Serial.print(F(" <- ")); Serial.println(credId);
}

void handleSyncComplete() {
  if (currentState == WAITING_SYNC) {
    if (finger.getImage() != FINGERPRINT_OK || finger.image2Tz(1) != FINGERPRINT_OK) {
      sensorLedRed(3);
      delay(800);
      sensorLedOff();
      currentState = IDLE;
      return;
    }
    int searchResult = performFingerSearch();
    if (searchResult == FINGERPRINT_OK && finger.fingerID < MAX_CACHE_SLOTS && slotTable[finger.fingerID].occupied) {
      publishLocalMatchBio(finger.fingerID, slotTable[finger.fingerID].credentialId, finger.confidence);
      slotTable[finger.fingerID].lastUsed = millis() / 1000;
      saveSlotTable();
      currentState = WAITING_RESULT;
    } else {
      sensorLedRed(3);
      delay(800);
      sensorLedOff();
      currentState = IDLE;
    }
  }
}

// -- Cadastro --
void resetEnrollmentState() {
  enrollmentStep = ENROLL_STEP_IDLE;
  currentState = IDLE;
  clearFingerprintSerialInput();
  sensorLedOff();
}

void startEnrollment(const String& enrollId, const String& userId, const String& fingerName) {
  enrollmentId = enrollId;
  enrollmentUserId = userId;
  enrollmentFinger = fingerName;
  enrollmentExpiresAt = millis() + ENROLLMENT_TIMEOUT_MS;
  enrollmentStep = ENROLL_STEP_WAITING_FIRST;
  enrollmentStepAt = millis();
  currentState = ENROLLMENT_MODE;
  publishEnrollmentProgress(enrollmentId, "WAITING_FIRST");
  sensorLedBlue();
}

void processEnrollment(unsigned long now, bool touched) {
  if (enrollmentStep == ENROLL_STEP_IDLE) return;

  if (now >= enrollmentExpiresAt) {
    publishEnrollmentProgress(enrollmentId, "EXPIRED");
    publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "EXPIRED", false, 0);
    sensorLedRed(3);
    delay(800);
    resetEnrollmentState();
    return;
  }

  switch (enrollmentStep) {
    case ENROLL_STEP_WAITING_FIRST:
      if (touched && (now - enrollmentStepAt >= FINGER_DEBOUNCE_MS)) {
        if (finger.getImage() == FINGERPRINT_OK && finger.image2Tz(1) == FINGERPRINT_OK) {
          enrollmentStep = ENROLL_STEP_WAITING_SECOND;
          enrollmentStepAt = now;
          publishEnrollmentProgress(enrollmentId, "FIRST_CAPTURED");
          sensorLedGreen(2);
          delay(600);
          sensorLedBlue();
        }
      }
      break;

    case ENROLL_STEP_WAITING_SECOND:
      if (touched && (now - enrollmentStepAt >= 1200)) {
        if (finger.getImage() == FINGERPRINT_OK && finger.image2Tz(2) == FINGERPRINT_OK) {
          enrollmentStep = ENROLL_STEP_CREATE_MODEL;
          enrollmentStepAt = now;
          publishEnrollmentProgress(enrollmentId, "SECOND_CAPTURED");
          sensorLedGreen(2);
        }
      }
      break;

    case ENROLL_STEP_CREATE_MODEL: {
      clearFingerprintSerialInput();
      delay(250);
      publishEnrollmentProgress(enrollmentId, "CREATING_MODEL");

      uint8_t result = finger.createModel();
      if (result != FINGERPRINT_OK) {
        publishEnrollmentProgress(enrollmentId, "FAILED");
        publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "FAILED", false, 0);
        sensorLedRed(3);
        delay(800);
        resetEnrollmentState();
        return;
      }

      publishEnrollmentProgress(enrollmentId, "EXTRACTING");

      int slot = findFreeSlot();
      if (slot < 0) { slot = findLruSlot(); if (slot >= 0) finger.deleteModel(slot); }
      if (slot >= 0) {
        if (finger.storeModel(slot) == FINGERPRINT_OK) {
          slotTable[slot].occupied = true;
          strncpy(slotTable[slot].credentialId, enrollmentId.c_str(), 37);
          slotTable[slot].credentialId[37] = '\0';
          slotTable[slot].lastUsed = millis() / 1000;
          saveSlotTable();
        }
      }

      bool hasTemplate = false;
      File f = LittleFS.open("/temp_template.hex", "w");
      if (f) {
        if (!captureTemplateHexFromSensor(f, slot)) {
          f.close();
          publishEnrollmentProgress(enrollmentId, "FAILED");
          publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "FAILED", false, 0);
          sensorLedRed(3);
          delay(800);
          resetEnrollmentState();
          return;
        }
        f.close();
        hasTemplate = true;
      } else {
        publishEnrollmentProgress(enrollmentId, "FAILED");
        publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "FAILED", false, 0);
        sensorLedRed(3);
        delay(800);
        resetEnrollmentState();
        return;
      }

      publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "SUCCESS", hasTemplate, 0);

      sensorLedGreen();
      delay(1500);
      resetEnrollmentState();
      return;
    }
    default: break;
  }
}

// -- Loop --
void loopBiometry() {
  unsigned long now = millis();
  bool touched = digitalRead(PIN_TOUCHOUT) == HIGH;

  if (currentState == ENROLLMENT_MODE) {
    processEnrollment(now, touched);
    return;
  }

  if (currentState == IDLE && touched) {
    if (now - lastFingerTime > FINGER_DEBOUNCE_MS) {
      Serial.println(F("[BIO] Toque detectado na biometria. Iniciando leitura..."));
      
      uint8_t imgResult = finger.getImage();
      if (imgResult == FINGERPRINT_OK) {
        Serial.println(F("[BIO] Imagem capturada. Convertendo..."));
        
        if (finger.image2Tz(1) == FINGERPRINT_OK) {
          Serial.println(F("[BIO] Buscando impressão digital no cache..."));
          int searchResult = performFingerSearch();
          
          if (searchResult == FINGERPRINT_OK) {
            Serial.print(F("[BIO] Match local no slot ")); Serial.println(finger.fingerID);
            publishLocalMatchBio(finger.fingerID, slotTable[finger.fingerID].credentialId, finger.confidence);
            slotTable[finger.fingerID].lastUsed = now / 1000;
            saveSlotTable();
            currentState = WAITING_RESULT;
          } else {
            Serial.println(F("[BIO] Sem match no cache local. Solicitando sync com servidor..."));
            currentState = WAITING_SYNC;
            publishRequestSync();
          }
        } else {
          Serial.println(F("[BIO] Falha ao converter imagem capturada."));
        }
      } else if (imgResult != FINGERPRINT_NOFINGER) {
        Serial.print(F("[BIO] Erro ao capturar imagem: 0x"));
        Serial.println(imgResult, HEX);
      }
      
      // Debounce ocorre independentemente do resultado para não travar o loop global
      lastFingerTime = now;
    }
  }
}
