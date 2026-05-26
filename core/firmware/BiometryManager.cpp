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
  while (Serial2.available()) {
    Serial2.read();
    delay(0);
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

// -- Sincronização --
// Mantendo simplificado pro guia; no real usaria a logica do PS_DownChar
void handleSyncTemplate(byte* payload, unsigned int length) {
  // A lógica completa de sync envolveria PS_DownChar.
  // Por brevidade neste unificado e para evitar estouro, 
  // pode-se implementar conforme a biometria original (ver arquivo original)
  Serial.println(F("[BIO] Recebido Sync-Template"));
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
  publishEnrollmentProgress("WAITING_FIRST");
  sensorLedBlue();
}

void processEnrollment(unsigned long now, bool touched) {
  if (enrollmentStep == ENROLL_STEP_IDLE) return;

  if (now >= enrollmentExpiresAt) {
    publishEnrollmentProgress("EXPIRED");
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
          publishEnrollmentProgress("FIRST_CAPTURED");
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
          publishEnrollmentProgress("SECOND_CAPTURED");
          sensorLedGreen(2);
        }
      }
      break;

    case ENROLL_STEP_CREATE_MODEL: {
      clearFingerprintSerialInput();
      delay(250);
      publishEnrollmentProgress("CREATING_MODEL");

      uint8_t result = finger.createModel();
      if (result != FINGERPRINT_OK) {
        publishEnrollmentProgress("FAILED");
        publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "FAILED", false, 0);
        sensorLedRed(3);
        delay(800);
        resetEnrollmentState();
        return;
      }

      publishEnrollmentProgress("EXTRACTING");

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

      // No ESP32, com a memoria livre maior, poderíamos extrair mais facilmente
      // Mock: consideramos que nao enviaremos o arquivo hex neste snippet por simplicidade
      publishEnrollmentResult(enrollmentId, enrollmentUserId, enrollmentFinger, "SUCCESS", false, 0);

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
      if (finger.getImage() == FINGERPRINT_OK && finger.image2Tz(1) == FINGERPRINT_OK) {
        int searchResult = performFingerSearch();
        if (searchResult == FINGERPRINT_OK) {
          publishLocalMatchBio(finger.fingerID, slotTable[finger.fingerID].credentialId, finger.confidence);
          slotTable[finger.fingerID].lastUsed = now / 1000;
          saveSlotTable();
          currentState = WAITING_RESULT;
          lastFingerTime = now;
        } else {
          // Solicita sincronização
          // No ESP32, as funções são chamadas no main
          currentState = WAITING_SYNC;
          lastFingerTime = now;
        }
      }
    }
  }
}
