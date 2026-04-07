#ifndef ZW111_H
#define ZW111_H

#include <Arduino.h>
#include <SoftwareSerial.h>

/* -------------------- Códigos de resposta -------------------- */
#define ZW111_OK 0x00
#define ZW111_PACKETRECIEVEERR 0x01
#define ZW111_NOFINGER 0x02
#define ZW111_IMAGEFAIL 0x03
#define ZW111_IMAGEMESS 0x06
#define ZW111_FEATUREFAIL 0x07
#define ZW111_NOMATCH 0x08
#define ZW111_NOTFOUND 0x09
#define ZW111_ENROLLMISMATCH 0x0A
#define ZW111_BADLOCATION 0x0B
#define ZW111_DBCLEARFAIL 0x0C
#define ZW111_UPLOADFEATUREFAIL 0x0D
#define ZW111_PACKETRESPONSEFAIL 0x0E
#define ZW111_UPLOADFAIL 0x0F
#define ZW111_DELETEFAIL 0x10
#define ZW111_PASSFAIL 0x13
#define ZW111_INVALIDIMAGE 0x15
#define ZW111_FLASHERR 0x18
#define ZW111_INVALIDREG 0x1A

/* -------------------- Constantes do protocolo -------------------- */
#define ZW111_STARTCODE 0xEF01
#define ZW111_COMMANDPACKET 0x01
#define ZW111_ACKPACKET 0x07

/* -------------------- Comandos -------------------- */
#define ZW111_GETIMAGE 0x01
#define ZW111_GENCHAR 0x02
#define ZW111_MATCH 0x03
#define ZW111_SEARCH 0x04
#define ZW111_REGMODEL 0x05
#define ZW111_STORE 0x06
#define ZW111_DELETE 0x0C
#define ZW111_EMPTY 0x0D
#define ZW111_SETPWD 0x12
#define ZW111_VFYPWD 0x13
#define ZW111_HISPEEDSEARCH 0x1B
#define ZW111_TEMPLATECOUNT 0x1D
#define ZW111_CTRL_LED 0x35 // comando correto para LED (conforme seu teste)
#define ZW111_HANDSHAKE                                                        \
  0x40 // opcode opcional – usaremos verifyPassword como fallback

/* -------------------- Cores do LED (do arquivo zw111.h) --------------------
 */
#define LED_OFF 0x00
#define LED_BLUE 0x01
#define LED_GREEN 0x02
#define LED_RED 0x04
#define LED_CYAN 0x03    // GREEN + BLUE
#define LED_MAGENTA 0x05 // RED + BLUE
#define LED_YELLOW 0x06  // RED + GREEN
#define LED_WHITE 0x07   // ALL

class ZW111 {
public:
  ZW111(SoftwareSerial *ss);
  void begin(uint32_t baud);

  // Handshake / password verification
  bool verifyPassword(); // comando 0x13 – verifica senha padrão (0)
  uint8_t handshake();   // tenta opcode 0x40, fallback to verifyPassword

  // LED control (breathing mode = 0x03)
  uint8_t ledControl(uint8_t mode, uint8_t speed, uint8_t color, uint8_t count);

  // Core fingerprint functions
  uint8_t getImage();
  uint8_t image2Tz(uint8_t buffer);
  uint8_t createModel();
  uint8_t storeModel(uint16_t id);
  uint8_t fingerSearch();
  uint8_t emptyDatabase();
  uint8_t getTemplateCount();

  // Result fields (filled after fingerSearch)
  uint16_t fingerID;
  uint16_t confidence;
  uint16_t templateCount;

private:
  SoftwareSerial *mySerial;
  uint32_t theAddress;  // default broadcast 0xFFFFFFFF
  uint32_t thePassword; // default 0x00000000

  void writePacket(const uint8_t *payload, uint16_t payloadLen);
  uint8_t getReply(uint8_t *outPayload, uint16_t timeout = 1000);
};

#endif // ZW111_H