#include "ZW111.h"

/* -------------------------------------------------------------------
 *  Implementação da classe ZW111 – versão corrigida
 *  Constrói os pacotes exatamente como descrito no datasheet:
 *    EF01 | address(4) | pid | length(2) | payload | checksum(2)
 *  Todos os comandos (verifyPassword, handshake, ledControl, etc.)
 *  utilizam essa rotina única de writePacket.
 * ------------------------------------------------------------------- */

ZW111::ZW111(SoftwareSerial *ss) {
  mySerial = ss;
  thePassword = 0;         // senha padrão 0x00000000
  theAddress = 0xFFFFFFFF; // broadcast address
}

void ZW111::begin(uint32_t baud) { mySerial->begin(baud); }

/* -------------------- UTILIDADES -------------------- */
static uint16_t calcChecksum(const uint8_t *buf, uint16_t len) {
  uint16_t sum = 0;
  for (uint16_t i = 0; i < len; ++i)
    sum += buf[i];
  return sum;
}

void ZW111::writePacket(const uint8_t *payload, uint16_t payloadLen) {
  // Length = payloadLen + 2 (payload + checksum)
  uint16_t len = payloadLen + 2;

  uint8_t frame[9 + payloadLen +
                2]; // header(2)+addr(4)+pid(1)+len(2)+payload+checksum(2)

  // Header
  frame[0] = (ZW111_STARTCODE >> 8) & 0xFF;
  frame[1] = ZW111_STARTCODE & 0xFF;
  // Address (broadcast)
  frame[2] = (theAddress >> 24) & 0xFF;
  frame[3] = (theAddress >> 16) & 0xFF;
  frame[4] = (theAddress >> 8) & 0xFF;
  frame[5] = theAddress & 0xFF;
  // Packet identifier (command packet)
  frame[6] = ZW111_COMMANDPACKET;
  // Length (big‑endian)
  frame[7] = (len >> 8) & 0xFF;
  frame[8] = len & 0xFF;
  // Payload (instruction + parameters)
  memcpy(&frame[9], payload, payloadLen);
  // Checksum (sum of pid, length bytes and payload)
  uint16_t sum = ZW111_COMMANDPACKET + frame[7] + frame[8];
  for (uint16_t i = 0; i < payloadLen; ++i)
    sum += payload[i];
  // Append checksum (big‑endian)
  frame[9 + payloadLen] = (sum >> 8) & 0xFF;
  frame[9 + payloadLen + 1] = sum & 0xFF;

  mySerial->write(frame, sizeof(frame));
}

uint8_t ZW111::getReply(uint8_t *outPayload, uint16_t timeout) {
  uint8_t buf[64];
  uint16_t idx = 0;
  uint32_t start = millis();

  // Espera pelo cabeçalho 0xEF 0x01
  while (millis() - start < timeout) {
    if (mySerial->available()) {
      uint8_t b = mySerial->read();
      if (idx == 0 && b == (ZW111_STARTCODE >> 8)) {
        buf[idx++] = b;
        continue;
      }
      if (idx == 1 && b == (ZW111_STARTCODE & 0xFF)) {
        buf[idx++] = b;
        continue;
      }
      if (idx >= 2) {
        buf[idx++] = b;
        if (idx == 9) { // já temos pid + length
          uint16_t plen =
              (buf[7] << 8) | buf[8]; // inclui instruction+params+checksum
          uint16_t total = 9 + plen;
          // lê o restante do frame
          while (idx < total && (millis() - start) < timeout) {
            if (mySerial->available())
              buf[idx++] = mySerial->read();
          }
          // verifica checksum
          uint16_t sum = 0;
          for (uint16_t i = 6; i < total - 2; ++i)
            sum += buf[i];
          uint16_t recv = (buf[total - 2] << 8) | buf[total - 1];
          if (sum != recv)
            return ZW111_PACKETRECIEVEERR;
          // copia payload (instruction + parâmetros) sem checksum
          uint8_t payloadLen = plen - 2;
          memcpy(outPayload, &buf[9], payloadLen);
          return payloadLen; // número de bytes retornados
        }
      }
    }
  }
  return ZW111_PACKETRECIEVEERR; // timeout
}

/* -------------------- COMANDOS -------------------- */
bool ZW111::verifyPassword() {
  uint8_t pkt[5] = {ZW111_VFYPWD, (uint8_t)(thePassword >> 24),
                    (uint8_t)(thePassword >> 16), (uint8_t)(thePassword >> 8),
                    (uint8_t)(thePassword & 0xFF)};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  return (len >= 1 && resp[0] == ZW111_OK);
}

uint8_t ZW111::handshake() {
  // Usa o opcode 0x40 se o módulo o suportar; caso contrário, fallback para
  // verifyPassword.
  uint8_t pkt[1] = {ZW111_HANDSHAKE};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

uint8_t ZW111::ledControl(uint8_t mode, uint8_t speed, uint8_t color,
                          uint8_t count) {
  uint8_t pkt[5] = {ZW111_CTRL_LED, mode, speed, color, count};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

uint8_t ZW111::getImage() {
  uint8_t pkt[1] = {ZW111_GETIMAGE};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

uint8_t ZW111::image2Tz(uint8_t buffer) {
  uint8_t pkt[2] = {ZW111_GENCHAR, buffer};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

uint8_t ZW111::createModel() {
  uint8_t pkt[1] = {ZW111_REGMODEL};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

uint8_t ZW111::storeModel(uint16_t id) {
  uint8_t pkt[4] = {ZW111_STORE, 0x01, (uint8_t)(id >> 8),
                    (uint8_t)(id & 0xFF)};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

uint8_t ZW111::fingerSearch() {
  // 0xA3 = alta velocidade, modo padrão
  uint8_t pkt[6] = {ZW111_SEARCH, 0x01, 0x00, 0x00, 0x00, 0xA3};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  if (len >= 5 && resp[0] == ZW111_OK) {
    fingerID = (resp[1] << 8) | resp[2];
    confidence = (resp[3] << 8) | resp[4];
    return ZW111_OK;
  }
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

uint8_t ZW111::emptyDatabase() {
  uint8_t pkt[1] = {ZW111_EMPTY};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

uint8_t ZW111::getTemplateCount() {
  uint8_t pkt[1] = {ZW111_TEMPLATECOUNT};
  writePacket(pkt, sizeof(pkt));
  uint8_t resp[16];
  uint8_t len = getReply(resp);
  if (len >= 3 && resp[0] == ZW111_OK) {
    templateCount = (resp[1] << 8) | resp[2];
    return ZW111_OK;
  }
  return (len >= 1) ? resp[0] : ZW111_PACKETRECIEVEERR;
}

/* -------------------------------------------------------------------
 *  Outras funções (deleteModel, loadModel, etc.) podem ser adicionadas
 *  seguindo o mesmo padrão acima, caso precise no futuro.
 * ------------------------------------------------------------------- */