# HARDWARE — Implementações Realizadas

## HW-001 (teste) — Firmware de Teste ESP32S

**Status:** 🔧 Parcial — firmware de teste funcional e documentado; não modularizado em `core/`

---

### Contexto

O firmware definitivo ainda não foi criado em `core/` (diretório vazio). No entanto, um firmware de teste completo foi desenvolvido e documentado em `.claude/test/hardware-porta/` para validar o protocolo MQTT contra o broker real do projeto.

O dispositivo usado nos testes é o **ESP-32S** (não o ESP8266 original do plano), por ter mais memória RAM e maior velocidade de processamento. O firmware final pode ser portado para ESP8266 se necessário.

---

### O que foi implementado no firmware de teste

**Arquivo:** `.claude/test/hardware-porta/firmware-teste.ino` (documentado)

#### Conectividade
- Conexão Wi-Fi com reconexão automática
- Cliente MQTT via `PubSubClient` com reconexão automática
- Client ID único gerado a partir do MAC address do ESP32

#### Tópicos MQTT implementados

| Tópico | Direção | Descrição |
|--------|---------|-----------|
| `door/{id}/register` | Publish | Registro inicial com `controllerId` e `roomId` |
| `door/{id}/heartbeat` | Publish | Keep-alive a cada 30s com `firmwareVersion` |
| `door/{id}/status` | Publish | Estado da porta e fechadura a cada 500ms |
| `door/{id}/access-attempt` | Publish | Credencial apresentada (simulada) |
| `door/{id}/access-result` | Subscribe | Recebe decisão GRANTED/DENIED |
| `door/{id}/command` | Subscribe | Recebe comandos UNLOCK/LOCK/SYNC_STATE |
| `door/{id}/command-result` | Publish | ACK do comando executado |

#### Sensores implementados no teste

**SCT-013 (sensor de corrente):**
- Mede corrente da fechadura para inferir estado (travada/destravada)
- Calcula RMS de 100 amostras em janela de tempo
- Threshold configurável (`CURRENT_THRESHOLD`) para binarizar o estado
- Lógica: corrente acima do threshold → fechadura energizada (travada)

**Botão (simulando reed switch):**
- Pino digital com `INPUT_PULLUP`
- Detecta porta aberta/fechada (LOW = fechada, HIGH = aberta)
- Em produção: substituir por reed switch magnético real

#### Loop principal (não-bloqueante)
- Usa `millis()` para todos os timers — nunca `delay()` no loop
- Envia heartbeat a cada `HEARTBEAT_INTERVAL` (30s)
- Lê e publica status a cada `STATUS_INTERVAL` (500ms)
- Detecta mudanças de estado para publicar apenas quando há alteração

#### Manipulação de comandos recebidos
```
Receber door/{id}/command
    │
    ├── UNLOCK → (aciona relé — stub no teste)
    ├── LOCK   → (desaciona relé — stub no teste)
    └── SYNC_STATE → publica estado atual imediatamente
    │
    └── Publicar door/{id}/command-result com status "EXECUTED"
```

---

### Constantes configuráveis no firmware de teste

```cpp
const char* WIFI_SSID         // SSID da rede Wi-Fi
const char* WIFI_PASSWORD     // Senha da rede Wi-Fi
const char* MQTT_SERVER       // IP/hostname do broker MQTT
const int   MQTT_PORT         // Porta TCP do broker (1883)
const char* CONTROLLER_ID     // UUID do controlador (deve existir no banco)
const char* ROOM_ID           // UUID da sala vinculada
const int   PIN_DOOR_SENSOR   // Pino do botão/reed switch
const int   PIN_CURRENT       // Pino analógico do SCT-013
const unsigned long HEARTBEAT_INTERVAL  // Intervalo do heartbeat (ms)
const unsigned long STATUS_INTERVAL     // Intervalo de publicação de status (ms)
const int   CURRENT_THRESHOLD // Limiar de corrente para detectar fechadura ativa
```

---

### Dependências (Arduino IDE / PlatformIO)

```
knolleary/PubSubClient      // Cliente MQTT
bblanchon/ArduinoJson       // Serialização/deserialização JSON
```

---

### Validações realizadas com o hardware físico

- [x] ESP32S conecta ao Wi-Fi e ao broker Aedes do projeto
- [x] Tópico `register` recebido e processado pelo broker (controlador criado no banco)
- [x] Heartbeat atualiza `lastSeenAt` no banco via broker → backend
- [x] Status de porta publicado corretamente (doorState: OPEN/CLOSED, isLocked: true/false)
- [x] Broker entrega comando `UNLOCK` ao dispositivo via polling
- [x] Dispositivo publica `command-result` com ACK após receber comando
- [ ] Tentativa de acesso com credencial real (pendente — requer biométrico/RFID no circuito)
- [ ] Controle real do relé da fechadura (pendente — hardware não adquirido)
- [ ] Reed switch físico (testado apenas com botão simulado)

---

### Circuito do teste

```
ESP-32S
├── GND ──────────────────── GND (comum)
├── 3.3V ─────────────────── VCC (lógica)
├── GPIO34 (ADC) ─────────── SCT-013 (saída com burden resistor 33Ω)
│                              └── SCT-013 abraça o fio da fechadura
└── GPIO35 (INPUT_PULLUP) ── Botão (outro terminal ao GND)
                               └── Simula reed switch
```

**Divisor de tensão para SCT-013:**
- Burden resistor de 33Ω entre o pino analógico e GND
- Capacitor de 10µF em paralelo com o burden resistor (filtragem)
- Resistores de 10kΩ em divisor de tensão para centralizar o sinal em 1.65V (VCC/2)

---

## HW-002 — Sensor Biométrico (DY50 / ZN-53X)

**Status:** ⬜ Não iniciado no firmware

**Hardware possuído:** ZN-53X / 63X + módulo A21 UART Boland

**Próximos passos:**
1. Identificar o protocolo serial do ZN-53X (verificar se é compatível com `Adafruit_Fingerprint`)
2. Conectar via UART (TX/RX) ao ESP32
3. Implementar módulo `biometric_sensor.h/.cpp` em `core/`
4. Integrar ao loop de leitura de credenciais

---

## HW-003 — Leitor RFID RC522

**Status:** ⬜ Não iniciado no firmware

**Hardware possuído:** 1× leitor NFC (verificar se é RC522 / MFRC522)

**Próximos passos:**
1. Conectar via SPI ao ESP32 (pinos MOSI, MISO, SCK, SS, RST)
2. Usar biblioteca `miguelbalboa/MFRC522`
3. Implementar módulo `rfid_reader.h/.cpp` em `core/`
4. Ler UID do cartão e publicar como credencial no tópico `access-attempt`

---

## HW-004 — Controle do Relé da Fechadura

**Status:** ⬜ Não iniciado (hardware pendente de aquisição)

**Hardware necessário:** Módulo relé 5V + fechadura solenoide 12V + fonte 12V/2A

**Próximos passos:**
1. Adquirir hardware (ver `.claude/items.md`)
2. Implementar módulo `lock_controller.h/.cpp` em `core/`
3. Acionar relé por tempo configurável (`LOCK_DURATION_MS`) no evento UNLOCK
4. Integrar com o handler de `access-result` (GRANTED → acionar relé)

---

## HW-005 — Detecção de Estado da Porta (Reed Switch)

**Status:** 🔧 Parcial — testado com botão simulado; reed switch físico não adquirido

**O que funciona:** lógica de detecção com `INPUT_PULLUP` e publicação de mudanças de estado

**Pendente:**
- Adquirir reed switch + ímã de neodímio
- Substituir o botão de simulação pelo reed switch no circuito

---

## HW-006 — Protocolo de Reconexão e Fallback Offline

**Status:** ⬜ Não iniciado

**Descrição:** O firmware de teste implementa reconexão básica (loop de tentativas), mas não há fallback para operação offline (modo local sem MQTT). Para o TCC, o fallback offline pode ser simplificado: se MQTT indisponível por N segundos, manter último estado da fechadura.