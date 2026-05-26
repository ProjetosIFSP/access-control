#include "NfcManager.h"
#include <SPI.h>
#include <MFRC522.h>

MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);

const unsigned long TAG_DEBOUNCE_MS = 3000;
String lastTagUid  = "";
unsigned long lastTagTime = 0;

void setupNfc() {
  SPI.begin();
  rfid.PCD_Init();
  delay(4);

  byte v = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.print(F("[RFID] RC522 v")); Serial.println(v, HEX);
  if (v == 0x00 || v == 0xFF) {
    Serial.println(F("[RFID] ALERTA: RC522 sem resposta!"));
  }
}

void loopNfc() {
  // Apenas processa NFC se estiver em IDLE
  if (currentState != IDLE) return;

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // Montar UID como string hex "AA:BB:CC:DD"
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i) uid += ":";
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  unsigned long now = millis();
  // Debounce
  if (uid == lastTagUid && (now - lastTagTime) < TAG_DEBOUNCE_MS) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  Serial.print(F("[RFID] Tag: ")); Serial.println(uid);

  lastTagUid  = uid;
  lastTagTime = now;
  pendingTagUid = uid;

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  // Indica a leitura
  digitalWrite(PIN_LED, HIGH);
  delay(80);
  digitalWrite(PIN_LED, LOW);

  // Manda para o módulo principal processar o evento via callback / variável global
  publishAccessAttemptNfc(uid);
}
