# Teste de Hardware — Estado da Porta (ESP-32S + SCT-013)

Guia passo a passo para montar, conectar e testar a detecção de estado de porta usando o ESP-32S, sensor de corrente SCT-013 e botão (simulando reed switch).

> **Nota:** Este teste não reflete o produto final. É um ambiente de validação do protocolo MQTT e dos sensores disponíveis.

---

## Componentes utilizados

| Componente | Função no teste |
|---|---|
| **ESP-32S** | Controlador principal — conecta ao WiFi, publica MQTT |
| **Sensor de corrente SCT-013** | Detecta corrente na fechadura para inferir estado (travada/destravada) |
| **Botão / chave** | Simula o reed switch (porta aberta/fechada) |
| **Protoboard** | Montagem do circuito |
| **Resistores (10kΩ, 33Ω)** | Divisor de tensão e burden resistor do SCT-013 |
| **Capacitor 10µF** | Filtragem do sinal do SCT-013 |
| **Fios jumper** | Conexões |

> O reed switch real (sensor magnético) ainda não foi adquirido. O botão simula seu comportamento: botão pressionado = porta fechada, solto = porta aberta.

---

## Arquitetura do teste

```
                                          ┌─────────────────┐
  ┌──────────────┐     MQTT (WiFi)        │  Broker MQTT    │
  │   ESP-32S    │ ──────────────────────►│ (npm run dev:iot)│
  │              │                        └────────┬────────┘
  │  GPIO34 ◄─── SCT-013 (ADC)                    │ HTTP
  │  GPIO35 ◄─── Botão com pull-up (digital)      ▼
  │              │                        ┌─────────────────┐
  └──────────────┘                        │   API REST      │
                                          │ (localhost:3333) │
                                          └─────────────────┘
```

---

## Circuito — Conexões

### ESP-32S — Alimentação e Wi-Fi

| Pino ESP-32S | Conectar em |
|---|---|
| `GND` | GND da protoboard (linha negativa) |
| `3.3V` | VCC da protoboard (linha positiva) |
| USB | Computador (alimentação + upload de firmware) |

### Sensor SCT-013 (medição de corrente da fechadura)

O SCT-013 é um transformador de corrente — você envolve o fio de alimentação da carga (fechadura/lâmpada de teste) com ele. Nos testes sem fechadura real, passe qualquer fio carregando corrente AC (ex: extensão de 110V com uma lâmpada).

**Circuito de condicionamento de sinal:**

```
SCT-013 saída (2 fios)
    │
    ├──── Resistor burden 33Ω ──── GND
    │                │
    │                └── Capacitor 10µF (em paralelo com o burden)
    │
    ├──── Divisor de tensão:
    │         10kΩ ─── VCC (3.3V)
    │                   │
    └── GPIO34 (ADC) ───┤
                        │
    10kΩ ───────────────┘
    │
    GND
```

> O divisor de tensão centraliza o sinal em ~1.65V (VCC/2) para que o ADC do ESP32 leia tanto os semiciclos positivos quanto negativos da corrente alternada.

### Botão (simulando reed switch)

| Pino ESP-32S | Conectar em |
|---|---|
| `GPIO35` | Um terminal do botão |
| `GND` | Outro terminal do botão |

O pino é configurado como `INPUT_PULLUP` no firmware — o resistor de pull-up interno do ESP32 mantém o sinal em HIGH quando o botão não está pressionado.

| Estado do botão | Leitura GPIO35 | doorState publicado |
|---|---|---|
| Solto (porta aberta) | HIGH | `"OPEN"` |
| Pressionado (porta fechada) | LOW | `"CLOSED"` |

---

## Firmware de teste

### Dependências

Instalar via Arduino IDE (Sketch → Include Library → Manage Libraries):
- `PubSubClient` by Nick O'Leary (v2.8+)
- `ArduinoJson` by Benoit Blanchon (v6.x)

Placa: **ESP32 Dev Module** (via Boards Manager: `esp32 by Espressif`)

### Código completo

Ver arquivo [`firmware-teste.ino`](./firmware-teste.ino) neste diretório.

### Configuração antes de carregar

Editar as constantes no topo do arquivo:

```cpp
const char* WIFI_SSID     = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";
const char* MQTT_SERVER   = "192.168.X.X";   // IP do computador com o broker
const int   MQTT_PORT     = 1883;

const char* CONTROLLER_ID = "esp32-porta-teste";
const char* ROOM_ID       = "UUID_DA_SALA";   // obter via GET /rooms
```

Para obter o UUID de uma sala:
```bash
curl http://localhost:3333/rooms | python3 -m json.tool
```

---

## Passos para execução do teste

### 1. Preparar o servidor

```bash
# Terminal 1 — Banco de dados
docker-compose -f docker-compose.local.yml up -d

# Terminal 2 — Backend API
npm run dev:server

# Terminal 3 — Broker MQTT
npm run dev:iot
```

### 2. Montar o circuito

Seguir o diagrama da seção "Circuito — Conexões" acima.

### 3. Carregar o firmware

1. Conectar o ESP-32S via USB
2. No Arduino IDE: selecionar placa **ESP32 Dev Module** e a porta COM correta
3. Upload do código

### 4. Monitorar o Serial

Abrir o Serial Monitor (115200 baud). Deve aparecer:

```
Conectando WiFi... conectado! IP: 192.168.X.X
Conectando MQTT... conectado!
Registro enviado: {"roomId":"...","firmwareVersion":"0.1.0-test"}
```

### 5. Verificar no broker

No terminal do broker, deve aparecer:

```
INFO: Client connected (clientId: esp32-porta-teste)
INFO: Controller registered
```

### 6. Testar mudanças de estado

| Ação física | Estado esperado | Como verificar |
|---|---|---|
| Soltar o botão | `doorState: "OPEN"` | Log do broker + `GET /rooms` |
| Pressionar o botão | `doorState: "CLOSED"` | Idem |
| Passar corrente no SCT-013 | `isLocked: true` | Idem |
| Remover corrente do SCT-013 | `isLocked: false` | Idem |

```bash
# Verificar estado da sala via API
curl -s http://localhost:3333/rooms | python3 -m json.tool
```

### 7. Testar comando UNLOCK

Via API, criar um comando UNLOCK para o controlador:

```bash
curl -X POST http://localhost:3333/iot/devices/esp32-porta-teste/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "UNLOCK", "expiresInSeconds": 30}'
```

O broker deve entregar o comando ao ESP32 via polling. No Serial Monitor deve aparecer:

```
MQTT recebido [door/esp32-porta-teste/command]: {"commandId":"...","type":"UNLOCK"}
Comando recebido: UNLOCK (id: ...)
ACK enviado: {"commandId":"...","status":"COMPLETED"}
```

---

## Tópicos MQTT implementados no firmware de teste

| Tópico | Direção | Intervalo | Descrição |
|--------|---------|-----------|-----------|
| `door/{id}/register` | Publish | 1× (boot) | Registro com roomId e firmwareVersion |
| `door/{id}/heartbeat` | Publish | 30s | Keep-alive |
| `door/{id}/status` | Publish | 500ms (se mudou) | doorState + isLocked |
| `door/{id}/access-attempt` | Publish | Evento | Credencial apresentada (stub) |
| `door/{id}/access-result` | Subscribe | — | Recebe GRANTED/DENIED |
| `door/{id}/command` | Subscribe | — | Recebe UNLOCK/LOCK/SYNC_STATE |
| `door/{id}/command-result` | Publish | Evento | ACK do comando |

---

## Lógica de detecção de estado

### Porta aberta/fechada (botão / reed switch)

```
Pino INPUT_PULLUP
  HIGH (solto)   → doorState = "OPEN"
  LOW  (pressionado) → doorState = "CLOSED"

Em produção: reed switch substitui o botão.
  Ímã próximo (porta fechada)  → contato fechado → LOW → "CLOSED"
  Ímã distante (porta aberta) → contato aberto  → HIGH → "OPEN"
```

### Fechadura travada/destravada (SCT-013)

```
SCT-013 mede corrente AC que passa pela fechadura solenoide.

Calcula RMS de 100 amostras em ~20ms (1 ciclo de 60Hz):
  rms > CURRENT_THRESHOLD → isLocked = true  (fechadura energizada = travada)
  rms ≤ CURRENT_THRESHOLD → isLocked = false (fechadura sem energia = destravada)

Nota: válido para fechaduras fail-secure (energizada = travada).
      Para fail-safe (energizada = destravada), inverter a lógica.
```

---

## Validações realizadas

- [x] ESP32S conecta ao Wi-Fi e ao broker Aedes do projeto
- [x] Tópico `register` recebido e processado (controlador criado/atualizado no banco)
- [x] Heartbeat atualiza `lastSeenAt` a cada 30s
- [x] Status de porta publicado corretamente (`doorState`, `isLocked`)
- [x] Broker entrega comando `UNLOCK` via polling ao ESP32
- [x] ESP32 publica `command-result` com ACK após receber comando
- [ ] Tentativa de acesso com credencial real (pendente — requer biométrico/RFID no circuito)
- [ ] Controle real do relé da fechadura (pendente — hardware não adquirido)
- [ ] Reed switch físico (testado apenas com botão simulado)

---

## Troubleshooting

| Problema | Possível causa | Solução |
|---|---|---|
| ESP não conecta Wi-Fi | SSID/senha errados | Verificar credenciais, testar com celular na mesma rede |
| ESP não conecta MQTT | IP do broker errado / firewall | Verificar IP com `ifconfig` / `ipconfig`; desativar firewall temporariamente |
| Status não aparece no broker | Tópico com nome errado | Verificar no Serial Monitor o tópico publicado |
| ADC do SCT-013 sempre 0 | Circuito do burden mal montado | Verificar resistor de 33Ω e divisor de tensão |
| `doorState` não muda ao pressionar botão | `INPUT_PULLUP` não configurado | Verificar `pinMode(PIN_DOOR_SENSOR, INPUT_PULLUP)` no `setup()` |
| Broker não recebe `command-result` | Subscribe no tópico errado | Confirmar que o ESP assinou `topicCommand` corretamente |