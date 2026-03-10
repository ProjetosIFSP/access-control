# Teste — Terminal de Enrollment Biométrico (ZN-53X + ESP32)

Guia passo a passo para montar, conectar e validar o terminal de enrollment biométrico usando o ESP32S e o sensor ZN-53X/A21 UART.

> **Nota:** Este teste não reflete o produto final modularizado. É um ambiente de validação incremental do hardware biométrico e do fluxo MQTT de enrollment, executado antes da implementação definitiva em `core/`.

---

## O que este teste valida

| # | O que é testado | Por que é importante |
|---|---|---|
| 1 | ZN-53X responde ao protocolo R30x (compatibilidade com Adafruit) | Pré-requisito de tudo — sem isso, nenhum passo adiante funciona |
| 2 | Captura de 2 passagens e geração de template via `createModel()` | Valida o fluxo de enrollment local no sensor |
| 3 | Extração do template de 256 bytes via `getModel()` (UploadTemplate 0x08) | Valida que o blob pode ser lido pelo ESP32 |
| 4 | Transmissão do template ao backend via MQTT | Valida o protocolo de enrollment end-to-end |
| 5 | Download do template de volta para o ZN-53X via `storeModel()` | Valida que o template distribuído pode ser carregado |
| 6 | Matching local do template carregado com `fingerFastSearch()` | Valida que a sincronização entre terminal e controladores funciona |

---

## Componentes utilizados

| Componente | Função no teste |
|---|---|
| **ESP32S** | Controlador principal — Wi-Fi, MQTT, controle UART do sensor |
| **ZN-53X / Módulo A21 UART Boland** | Sensor biométrico — captura, extração e matching de templates |
| **Protoboard + jumpers** | Conexão dos pinos |
| **Cabo USB** | Alimentação e upload do firmware |
| **LED RGB (ou 3 LEDs separados)** | Feedback visual das etapas de enrollment (opcional mas recomendado) |

---

## Circuito — Conexões

### ESP32S ↔ ZN-53X (UART)

O ZN-53X usa comunicação serial assíncrona (UART). O ESP32S tem três UARTs de hardware — usar a UART2 (pinos 16/17) deixa a UART0 (GPIO1/GPIO3) livre para o Serial Monitor.

| Pino ESP32S | Pino ZN-53X / A21 | Função |
|---|---|---|
| `GPIO16` (RX2) | `TX` (saída do sensor) | ESP32 recebe dados do sensor |
| `GPIO17` (TX2) | `RX` (entrada do sensor) | ESP32 envia comandos ao sensor |
| `3.3V` ou `5V` | `VCC` | Alimentação — **verificar datasheet do módulo físico** |
| `GND` | `GND` | Terra comum |

> ⚠️ **Atenção crítica:** Verificar se o módulo físico em mãos opera com lógica 3.3V ou 5V.
> O ESP32S trabalha com 3.3V nos pinos GPIO. Se o sensor usar 5V no TX, a tensão pode danificar o ESP32.
> Nesse caso, usar um divisor de tensão simples (10kΩ + 20kΩ) entre o TX do sensor e o RX2 do ESP32.

### Verificação de tensão antes de conectar

```
Com o multímetro, medir entre GND e VCC do módulo:
  - Se o módulo aceita 3.3V: conectar diretamente ao pino 3.3V do ESP32
  - Se o módulo aceita 5V: conectar ao pino VIN/5V do ESP32 (alimentado pelo USB)
    e usar divisor de tensão na linha TX do sensor → RX2 do ESP32
```

### LEDs de feedback (opcional)

| Pino ESP32S | Cor do LED | Significado |
|---|---|---|
| `GPIO25` | 🔴 Vermelho | Erro / falha na captura |
| `GPIO26` | 🟢 Verde | Sucesso — template capturado |
| `GPIO27` | 🔵 Azul | Aguardando passagem do dedo |

Conectar cada LED com resistor de 220Ω em série para o GND.

### Diagrama completo

```
ESP32S
├── GPIO16 (RX2) ←──────── TX  ┐
├── GPIO17 (TX2) ───────→ RX  ├── ZN-53X / A21
├── 3.3V (ou 5V) ───────→ VCC ┘
├── GND ────────────────→ GND
│
├── GPIO25 ──[220Ω]──→ LED Vermelho ──→ GND
├── GPIO26 ──[220Ω]──→ LED Verde    ──→ GND
├── GPIO27 ──[220Ω]──→ LED Azul     ──→ GND
│
└── USB ──→ Computador (alimentação + Serial Monitor)
```

---

## Firmware de teste

O firmware de teste para este cenário está em [`firmware-enrollment-test.ino`](./firmware-enrollment-test.ino).

### Dependências (Arduino IDE)

Instalar via **Sketch → Include Library → Manage Libraries**:

| Biblioteca | Versão | Instalação |
|---|---|---|
| `Adafruit Fingerprint Sensor Library` | v2.x+ | Buscar "Adafruit Fingerprint" |
| `PubSubClient` | v2.8+ | Buscar "PubSubClient Nick O'Leary" |
| `ArduinoJson` | v6.x | Buscar "ArduinoJson Benoit Blanchon" |

Placa: **ESP32 Dev Module** (via Boards Manager: `esp32 by Espressif Systems`)

### Configuração antes de carregar

Editar as constantes no topo do arquivo `firmware-enrollment-test.ino`:

```cpp
const char* WIFI_SSID       = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD   = "SUA_SENHA_WIFI";
const char* MQTT_SERVER     = "192.168.X.X";   // IP do computador com o broker
const int   MQTT_PORT       = 1883;
const char* TERMINAL_ID     = "enrollment-terminal-01";
const int   SENSOR_BAUDRATE = 57600;           // tentar 9600 se não funcionar
```

---

## Passos de teste — em ordem incremental

Cada passo **depende do anterior**. Não pule etapas.

---

### PASSO 1 — Verificar compatibilidade do ZN-53X com o protocolo R30x

Este é o passo mais crítico. Confirma que o sensor físico fala o mesmo protocolo da biblioteca Adafruit.

#### O que o firmware faz neste passo

Ao inicializar, o firmware chama `finger.verifyPassword()`. Internamente, isso envia o pacote de verificação de senha padrão (`0xEF01 ... 0x13 0x00 0x00 0x00 0x00`) e aguarda o ACK.

#### Como executar

1. Montar o circuito conforme descrito acima
2. Carregar o firmware no ESP32S
3. Abrir o **Serial Monitor** (115200 baud, sem NL/CR)
4. Observar a saída

#### Saída esperada — sucesso

```
[BOOT] Iniciando terminal de enrollment...
[SENSOR] Tentando conectar ao ZN-53X em 57600 baud...
[SENSOR] ✓ ZN-53X encontrado e respondendo!
[SENSOR] Capacidade: 162 templates | Nível de segurança: 3 | Tamanho do pacote: 64 bytes
[WIFI] Conectando a SUA_REDE...
[WIFI] ✓ Conectado! IP: 192.168.X.X
[MQTT] Conectando ao broker...
[MQTT] ✓ Conectado! Aguardando comando de enrollment...
```

#### Saída — falha no sensor (mais comum)

```
[SENSOR] Tentando conectar ao ZN-53X em 57600 baud... FALHOU
[SENSOR] Tentando conectar ao ZN-53X em 9600 baud... FALHOU
[SENSOR] ✗ Sensor não encontrado. Verificar fiação e tensão.
```

#### Se falhar — diagnóstico

| Causa provável | Como verificar | Solução |
|---|---|---|
| TX/RX invertidos | Trocar os dois fios | Inverter GPIO16↔GPIO17 |
| Baudrate errado | Tentar 9600, 19200, 115200 | Alterar `SENSOR_BAUDRATE` |
| Tensão errada no VCC | Multímetro no VCC do sensor | Mudar entre 3.3V e 5V |
| Nível lógico incompatível (5V no RX do ESP32) | Multímetro no TX do sensor em repouso | Adicionar divisor de tensão |
| GND não compartilhado | Verificar continuidade GND | Conectar GND do sensor ao GND do ESP32 |

> **Registrar o baudrate que funcionou** — será necessário para todos os passos seguintes.

---

### PASSO 2 — Captura de digital e geração de template local

Confirma que o sensor consegue capturar uma digital e gerar um template internamente.

#### O que o firmware faz neste passo

Ao receber o comando `TEST_ENROLL` via Serial Monitor (digitar e enviar), o firmware executa:

```
getImage()       → captura imagem do dedo (slot buffer 1)
image2Tz(1)      → converte imagem em vetor de características (CharBuffer 1)
[aguarda retirada do dedo]
getImage()       → captura 2ª imagem
image2Tz(2)      → converte em vetor (CharBuffer 2)
createModel()    → combina CharBuffer 1 e 2 em template final
```

#### Como executar

1. Com o Serial Monitor aberto (do Passo 1), digitar `TEST_ENROLL` e pressionar Enter
2. Quando o LED azul acender (ou a mensagem aparecer), **passar o dedo no sensor**
3. Retirar o dedo quando o LED piscar
4. Passar o **mesmo dedo** novamente quando o LED azul acender de novo

#### Saída esperada — sucesso

```
[ENROLL] Iniciando captura — passe o dedo no sensor...
[ENROLL] 1ª captura: imagem obtida ✓
[ENROLL] 1ª captura: vetor extraído ✓
[ENROLL] Retire o dedo...
[ENROLL] Dedo removido ✓
[ENROLL] 2ª captura: imagem obtida ✓
[ENROLL] 2ª captura: vetor extraído ✓
[ENROLL] Template gerado com sucesso ✓
```

#### Erros comuns e soluções

| Código de erro | Significado | O que fazer |
|---|---|---|
| `FINGERPRINT_IMAGEMESS` | Imagem muito borrada | Limpar o sensor, posicionar o dedo com mais firmeza |
| `FINGERPRINT_FEATUREFAIL` | Poucos pontos característicos | Posicionar o dedo centralizado e com pressão uniforme |
| `FINGERPRINT_ENROLLMISMATCH` | As duas capturas são muito diferentes | Usar o mesmo dedo, mesma posição |
| `FINGERPRINT_NOFINGER` | Nenhum dedo detectado | Verificar se o dedo está posicionado sobre o sensor |

---

### PASSO 3 — Extração do template de 256 bytes

Confirma que o blob binário pode ser lido do sensor pelo ESP32 via UART.

#### O que o firmware faz neste passo

Após o `createModel()` do Passo 2, ao digitar `TEST_UPLOAD` no Serial Monitor, o firmware executa:

```
getModel()           → envia comando UploadTemplate (0x08) ao sensor
                       o sensor responde com ACK + data packets
lê os data packets   → concatena os bytes de cada pacote
                       até receber o END data packet (0x08)
resultado            → buffer de 256 bytes
```

> **Nota sobre a biblioteca Adafruit:** O método `getModel()` apenas envia o comando e lê o ACK inicial. A leitura dos data packets subsequentes é feita manualmente no firmware de teste via `getStructuredPacket()` em loop.

#### Como executar

1. Após o Passo 2 com sucesso, digitar `TEST_UPLOAD` no Serial Monitor

#### Saída esperada — sucesso

```
[UPLOAD] Enviando comando UploadTemplate ao sensor...
[UPLOAD] ACK recebido ✓
[UPLOAD] Lendo data packets...
[UPLOAD] Pacote 1: 64 bytes ✓
[UPLOAD] Pacote 2: 64 bytes ✓
[UPLOAD] Pacote 3: 64 bytes ✓
[UPLOAD] Pacote 4: 64 bytes ✓ (END)
[UPLOAD] Template completo: 256 bytes ✓
[UPLOAD] Primeiros 16 bytes (hex): 4152 0100 0000 0000 0051 0000 0a00 003c
[UPLOAD] String hex completa (512 chars): 41520100...
```

> **Importante:** Anotar os primeiros 16 bytes. Se começar com `4152` (ASCII "AR"), o sensor usa o formato GROW/R30x padrão — confirmação definitiva de compatibilidade.

#### Se falhar

Se `getModel()` retornar erro após o `createModel()`, provavelmente o template não foi gerado corretamente no Passo 2. Repetir o Passo 2 com mais cuidado no posicionamento do dedo.

---

### PASSO 4 — Transmissão do template ao backend via MQTT

Confirma o fluxo completo de enrollment: captura → extração → publicação MQTT → persistência no banco.

#### Preparar o ambiente de servidor

```bash
# Terminal 1 — banco de dados
docker-compose -f docker-compose.local.yml up -d postgres

# Terminal 2 — backend API
npm run dev:server

# Terminal 3 — broker MQTT
npm run dev:iot
```

#### Criar um usuário de teste no banco (se ainda não existir)

```bash
# Listar usuários existentes
curl -s http://localhost:3333/users \
  -H "Cookie: SEU_COOKIE_DE_SESSAO" | python3 -m json.tool

# Anotar o userId de um usuário de teste
```

#### Disparar o enrollment via MQTT (simulando o portal)

Publicar manualmente o comando de enrollment usando qualquer cliente MQTT (ex: MQTTX, mosquitto_pub):

```bash
mosquitto_pub -h localhost -p 1883 \
  -t "enrollment/enrollment-terminal-01/start" \
  -m '{
    "enrollmentId": "test-enrollment-001",
    "userId": "UUID_DO_USUARIO_AQUI",
    "finger": "right_index",
    "expiresAt": "2099-01-01T00:00:00Z"
  }'
```

#### O que acontece após publicar

1. O ESP32 recebe o comando → LED azul acende
2. Passar o dedo no sensor (2 vezes conforme indicado pelo LED)
3. O firmware extrai o template e publica em `enrollment/enrollment-terminal-01/result`
4. O broker recebe, chama o backend, o backend persiste em `access_credential`

#### Verificar no banco

```bash
# Verificar se a credencial foi criada
curl -s http://localhost:3333/users/UUID_DO_USUARIO/fingerprints \
  -H "Cookie: SEU_COOKIE_DE_SESSAO" | python3 -m json.tool
```

#### Saída esperada no Serial Monitor

```
[MQTT] Comando de enrollment recebido!
[MQTT] enrollmentId: test-enrollment-001 | userId: ... | finger: right_index
[ENROLL] Iniciando captura — passe o dedo no sensor...
[ENROLL] Template gerado com sucesso ✓
[UPLOAD] Template extraído: 256 bytes ✓
[MQTT] Publicando resultado em enrollment/enrollment-terminal-01/result...
[MQTT] ✓ Publicado com sucesso
```

#### Saída esperada no broker

```
INFO: Mensagem recebida em enrollment/enrollment-terminal-01/result
INFO: Chamando POST /iot/enrollment/complete
INFO: Credencial biométrica criada: { credentialId: "...", userId: "...", finger: "right_index" }
INFO: Disparando sync para 0 controladores ativos
```

> *"0 controladores ativos"* é esperado neste passo — o Passo 6 testa a sincronização.

---

### PASSO 5 — Download do template de volta para o ZN-53X

Confirma que um template recebido externamente pode ser carregado no sensor.

Este passo simula o que cada controlador de acesso fará ao receber `door/{id}/sync-credentials`.

#### O que o firmware faz neste passo

Ao digitar `TEST_DOWNLOAD <hex_do_template>` no Serial Monitor, o firmware:

```
converte a string hex de 512 chars → buffer de 256 bytes
envia DownloadTemplate (0x09) ao sensor
envia os data packets com os 256 bytes (4 pacotes de 64 bytes)
sensor armazena no CharBuffer 1
storeModel(slot=5)   → persiste no slot 5 da memória flash interna
```

#### Como executar

1. Copiar a string hex de 512 chars impressa no Passo 3
2. No Serial Monitor, digitar: `TEST_DOWNLOAD 41520100...` (a string completa)

#### Saída esperada — sucesso

```
[DOWNLOAD] Convertendo 512 chars hex → 256 bytes...
[DOWNLOAD] Enviando DownloadTemplate ao sensor...
[DOWNLOAD] Enviando data packet 1/4 (64 bytes) ✓
[DOWNLOAD] Enviando data packet 2/4 (64 bytes) ✓
[DOWNLOAD] Enviando data packet 3/4 (64 bytes) ✓
[DOWNLOAD] Enviando data packet 4/4 (64 bytes) ✓ (END)
[DOWNLOAD] Template carregado no CharBuffer 1 ✓
[STORE] Armazenando no slot 5...
[STORE] ✓ Template armazenado no slot 5
```

---

### PASSO 6 — Matching local após sincronização

Confirma que o template carregado pode ser encontrado pelo `fingerFastSearch()`.

Este é o passo final e o mais importante: valida que um template cadastrado no terminal de enrollment é reconhecido por um controlador de acesso após sincronização.

#### Como executar

1. Após o Passo 5 (template carregado no slot 5), digitar `TEST_SEARCH` no Serial Monitor
2. **Passar o mesmo dedo** que foi usado no enrollment

#### Saída esperada — sucesso

```
[SEARCH] Capturando imagem...
[SEARCH] Imagem capturada ✓
[SEARCH] Extraindo vetor de características...
[SEARCH] Vetor extraído ✓
[SEARCH] Executando fingerFastSearch()...
[SEARCH] ✓ MATCH ENCONTRADO!
[SEARCH]   slotId:     5
[SEARCH]   confidence: 187  (threshold mínimo recomendado: 50)
```

#### Saída — sem match

```
[SEARCH] ✗ Nenhum match encontrado (FINGERPRINT_NOTFOUND)
```

Se isso acontecer após o Passo 5 ter funcionado:
- O dedo pode estar muito diferente entre as capturas (pressão, ângulo)
- Repetir o Passo 2 com mais atenção ao posicionamento
- Verificar se o nível de segurança do sensor está muito restritivo (tentar `setSecurityLevel(2)`)

---

## Tabela de validações — preencher durante o teste

```
## Resultados do Teste — Terminal de Enrollment

| Validação | Resultado | Observações |
|---|---|---|
| Passo 1 — Compatibilidade R30x | ☐ OK  ☐ Falhou | Baudrate que funcionou: ______ |
| Passo 1 — Formato dos primeiros bytes | ☐ 4152 (GROW)  ☐ Outro: ___ | |
| Passo 2 — Captura e createModel | ☐ OK  ☐ Falhou | Erros encontrados: __________ |
| Passo 3 — Extração 256 bytes | ☐ OK  ☐ Falhou | Tamanho real: _______ bytes |
| Passo 4 — Enrollment via MQTT | ☐ OK  ☐ Falhou | credentialId criado: ________ |
| Passo 5 — Download de template | ☐ OK  ☐ Falhou | |
| Passo 6 — Matching após sync | ☐ OK  ☐ Falhou | Confidence score: __________ |
| Data do teste | ____/____/_______ | |
| Testado por | _______________ | |

### Observações adicionais

(Comportamentos inesperados, mensagens de erro, diferenças de hardware, etc.)
```

---

## Resumo dos tópicos MQTT deste teste

| Tópico | Direção | Payload |
|---|---|---|
| `enrollment/{terminalId}/start` | Broker → Terminal | `{ enrollmentId, userId, finger, expiresAt }` |
| `enrollment/{terminalId}/result` | Terminal → Broker | `{ enrollmentId, userId, finger, template, quality, status }` |
| `door/{controllerId}/sync-credentials` | Broker → Controlador | `{ credentials: [{ credentialId, userId, template, finger, slot }] }` |
| `door/{controllerId}/sync-result` | Controlador → Broker | `{ slots: [{ slot, credentialId, status }] }` |

---

## Arquivos deste teste

| Arquivo | Descrição |
|---|---|
| `README.md` | Este guia |
| `firmware-enrollment-test.ino` | Firmware Arduino para ESP32S com todos os passos implementados |

---

## Próximo passo após concluir este teste

Com os 6 passos validados, o caminho está desbloqueado para:

1. **HW-007** — Implementação definitiva do terminal de enrollment em `core/` (PlatformIO, modularizado)
2. **HW-002** — Integração do ZN-53X nos controladores de acesso (recebe sync, faz matching, resolve slotId → credentialId)
3. Atualizar o fluxo MQTT no broker (`iot/`) para os novos tópicos de enrollment e sync
4. Criar os endpoints REST no backend para enrollment (`POST /iot/enrollment/complete`) e sync
5. Criar a tabela `controller_credential_slot` no schema do banco
6. Atualizar o portal web para iniciar enrollment via terminal (em vez de captura local com WA26)