#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ── Pinos e constantes Gerais ────────────────────────────────────────────────
#define PIN_LED      2   // LED_BUILTIN no ESP32
#define PIN_RELAY    21  // IN do módulo relé (Fechadura)

const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
const unsigned long ACCESS_RESULT_TIMEOUT = 10000;
const unsigned long SYNC_TIMEOUT_MS       = 45000;
const unsigned long ENROLLMENT_TIMEOUT_MS = 120000;

// ── Pinos NFC (MFRC522) via VSPI ─────────────────────────────────────────────
// No ESP32, VSPI: SCK=18, MISO=19, MOSI=23
#define PIN_RFID_SS  5   
#define PIN_RFID_RST 22  

// ── Pinos Biometria (ZW-101) via UART2 ───────────────────────────────────────
#define PIN_FINGER_RX 16 // Conectado ao TX do sensor
#define PIN_FINGER_TX 17 // Conectado ao RX do sensor
#define PIN_TOUCHOUT  4  // Interrupção/Detecção de toque

// ── Variáveis de Sistema Compartilhadas ──────────────────────────────────────
extern char controllerId[48];
extern char DEVICE_SECRET[40];

enum DoorState { OPEN, CLOSED, UNLOCKED, LOCKED, UNKNOWN };
extern DoorState currentDoorState;

enum TerminalState { IDLE, WAITING_RESULT, ENROLLMENT_MODE, WAITING_SYNC };
extern TerminalState currentState;

extern String pendingTagUid;
extern int pendingSlotId;
extern String pendingCredentialId;
extern uint16_t pendingConfidence;
extern bool pendingCacheStore;

// Callbacks (definidos no .ino e usados nas libs)
void publishAccessAttemptNfc(const String& uid);
void publishLocalMatchBio(int slotId, const char* credentialId, uint16_t confidence);
void publishRequestSync();
void publishEnrollmentProgress(const String &enrollmentIdValue, const String &step);
void publishEnrollmentResult(const String &enrollmentIdValue, const String &userIdValue, const String &fingerValue, const String &status, bool hasTemplate, uint8_t quality);

#endif // CONFIG_H
