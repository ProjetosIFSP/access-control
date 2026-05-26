#ifndef BIOMETRY_MANAGER_H
#define BIOMETRY_MANAGER_H

#include "Config.h"

void setupBiometry();
void loopBiometry();

// Métodos de LED exportados
void sensorLedOff();
void sensorLedGreen(uint8_t count = 0);
void sensorLedRed(uint8_t count = 0);
void sensorLedBlue();

// Métodos de Sync
void handleSyncTemplate(byte* payload, unsigned int length);
void handleSyncComplete();

// Fluxo de Cadastro
void startEnrollment(const String& enrollId, const String& userId, const String& fingerName);

// Cache
void cacheCurrentTemplate(const String &credId);

#endif // BIOMETRY_MANAGER_H
