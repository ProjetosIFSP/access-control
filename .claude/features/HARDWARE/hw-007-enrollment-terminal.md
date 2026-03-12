# HW-007 — Modo Terminal de Enrollment Biométrico nas Fechaduras (ZN-53X + ESP32-CAM)

## Informações Gerais

| Campo | Valor |
|---|---|
| **ID** | HW-007 |
| **Módulo** | HARDWARE |
| **Status** | ⬜ Não iniciado |
| **Prioridade** | 🔴 Alta — desbloqueia o fluxo biométrico completo |
| **Depende de** | HW-001 (firmware base modularizado), MQTT-001 |
| **Bloqueia** | HW-002 (integração biométrica nos controladores de acesso), CRED-001 (fluxo completo) |

---

## Descrição

Implementação do **modo terminal de enrollment** diretamente nas fechaduras existentes. Cada controlador NodeMCU v3 + ZN-53X + leitor NFC + módulo relê simples já instalado em uma porta pode alternar temporariamente entre dois modos de operação:

- **Modo Fechadura** (padrão): lê digital/NFC → matching local ou consulta backend → aciona relé via relay control board
- **Modo Terminal**: captura digital de um usuário específico → extrai template via UART → envia ao backend para persistência e sincronização

A troca de modo é disparada remotamente pelo backend via MQTT e tem duração limitada (TTL configurável, padrão 2 minutos). Ao expirar ou após enrollment bem-sucedido/cancelado, o controlador retorna automaticamente ao modo fechadura.

### Por que não um terminal dedicado?

Terminais dedicados exigiriam hardware extra, cabeamento adicional e um ponto físico permanente que não serve a nenhuma outra função fora do enrollment. Como cada sala já possui sua própria fechadura com NodeMCU v3 + ZN-53X + leitor NFC + módulo relê simples, aproveitar esse hardware existente é mais eficiente e elimina a necessidade de cadastro e gerenciamento de um novo tipo de dispositivo.

O admin simplesmente escolhe **qual fechadura** será usada para o enrollment, essa fechadura entra em modo terminal temporariamente, o usuário passa o dedo nela, e o template é extraído e distribuído para todas as demais fechaduras com o mesmo `sensorProtocol`.

### Por que o template deve ser extraído do ZN-53X e sincronizado?

O sistema possui N controladores de acesso (um por porta), cada um com seu próprio ZN-53X. Para que um único cadastro valha para todas as portas, o template gerado no enrollment precisa ser:

1. **Capturado** por um sensor ZN-53X (mesmo fabricante/algoritmo dos sensores nas portas)
2. **Extraído** como blob binário de 256 bytes via comando UART `UploadTemplate` (0x08)
3. **Armazenado** no backend (campo `access_credential.value`)
4. **Distribuído** para todos os controladores via tópico MQTT de sincronização
5. **Carregado** em cada ZN-53X das portas via comando UART `DownloadTemplate` (0x09) / `StoreModel` (0x06)

Isso garante compatibilidade total — o template é sempre gerado e validado pelo mesmo chip (protocolo R30x), eliminando problemas de interoperabilidade entre sensores de fabricantes diferentes.

---

## Funcionamento — Fluxo Completo

### Fase 1: Iniciação pelo admin (portal web)

```
Admin abre portal → navega até usuário X → aba Digitais
→ clica no dedo desejado → botão "Cadastrar via Fechadura"
→ portal exibe seletor de sala/fechadura (dropdown com fechaduras online)
→ admin confirma → portal chama POST /users/:id/fingerprints/enroll-request
   payload: { finger, controllerId }
→ backend cria registro de enrollment pendente com token (TTL: 2 min)
→ backend publica MQTT: door/{controllerId}/enter-enrollment-mode
   payload: { enrollmentId, userId, finger, expiresAt }
→ portal exibe spinner aguardando confirmação
```

#### Ponto de vista do admin

```
1. Admin abre o portal, navega até o usuário X → aba Digitais
2. Clica no dedo desejado → "Cadastrar via Fechadura"
3. Seleciona qual sala/fechadura usar (dropdown com fechaduras online)
4. Clica em confirmar → portal exibe spinner com countdown
5. Usuário X vai até a fechadura selecionada e passa o dedo
6. Portal confirma o cadastro automaticamente (polling ou WebSocket)
7. A fechadura retorna ao modo normal após confirmação
```

### Fase 2: Captura física na fechadura em modo terminal

```
ESP32-CAM recebe MQTT door/{id}/enter-enrollment-mode
→ salva estado atual (modo fechadura)
→ entra em modo terminal
→ acende LED azul pulsante via GPIO (sinaliza: "passe o dedo — modo cadastro")
→ ignora tentativas de acesso normais durante o enrollment

→ chama getImage() → image2Tz(slot=1) — 1ª captura via ZN-53X
→ acende LED roxo (pede 2ª passagem)
→ chama getImage() → image2Tz(slot=2) — 2ª captura via ZN-53X
→ chama createModel() — combina as duas capturas em um template
→ chama getModel() (UploadTemplate 0x08) — extrai 256 bytes via UART
→ converte bytes para string hex (512 chars)

→ publica MQTT: door/{id}/enrollment-result
   payload: { enrollmentId, userId, finger, template: "hex...", quality: 85 }

→ retorna ao modo fechadura imediatamente após publicar resultado
→ acende LED verde (sucesso) ou vermelho (falha) por 3 segundos
→ retorna ao comportamento normal de fechadura
```

**Timeout de segurança:**
```
Se o usuário não passar o dedo dentro do TTL (expiresAt):
→ ESP32-CAM retorna ao modo fechadura automaticamente
→ Publica door/{id}/enrollment-result com status: EXPIRED
→ Backend marca enrollment_request como EXPIRED
→ Portal exibe mensagem de timeout amigável
```

### Fase 3: Persistência e sincronização (backend)

```
Broker recebe door/{id}/enrollment-result
→ chama POST /iot/enrollment/complete no backend
→ backend valida enrollmentId + userId + finger
→ backend busca o controlador de origem → obtém sensorProtocol (ex: "R30X")
→ backend insere access_credential {
     userId, type: FINGERPRINT, finger, value: template,
     enrolledByControllerId: controllerId   ← rastreia qual fechadura cadastrou
  }
→ backend dispara sync SOMENTE para controladores com o mesmo sensorProtocol:
   para cada door_controller WHERE sensorProtocol = origem.sensorProtocol:
     publica MQTT: door/{controllerId}/sync-credentials
     payload: { credentials: [{ credentialId, userId, template, finger }] }
→ backend responde ao portal (polling de GET /iot/enrollment/:id/status) com sucesso
→ portal exibe confirmação

Nota: templates R30X só chegam a fechaduras R30X. Isso torna a troca de
hardware transparente — basta ajustar o sensorProtocol dos novos dispositivos.
```

> **Detalhe importante:** a fechadura que realizou o enrollment também recebe
> o `sync-credentials` e carrega o template no seu próprio ZN-53X, pois o
> template ficou apenas no buffer interno do sensor durante a captura — não
> é automaticamente persistido no slot de armazenamento do chip.

### Fase 4: Recepção nos controladores de acesso

```
Cada ESP32-CAM recebe door/{id}/sync-credentials
→ para cada credencial recebida:
   carrega template no ZN-53X via DownloadTemplate (0x09) em slot livre
   registra mapeamento: slotId → credentialId → userId
→ publica door/{id}/sync-result com lista de slots carregados
→ backend atualiza controller_credential_slot com slotId e syncedAt
```

### Validação (fluxo normal de acesso)

```
Usuário apresenta dedo na porta (modo fechadura — padrão)
→ ZN-53X executa fingerFastSearch() — matching local contra templates armazenados
→ retorna: slotId + confidence (ou NOTFOUND)
→ ESP32-CAM resolve slotId → credentialId → userId via mapeamento local
→ publica door/{id}/access-attempt
   payload: { credentialType: FINGERPRINT, credentialValue: credentialId }
→ backend verifica permissão → GRANTED / DENIED
→ ESP32-CAM envia comando à relay control board → aciona relé ou exibe feedback negativo
```

---

## Alternância de Modo — Estados do Firmware

```
┌─────────────────────────────────────────────────────────────┐
│                    MODO FECHADURA (padrão)                  │
│  - Lê digitais para acesso (ZN-53X via P4 da board)         │
│  - Lê cartões NFC para acesso (leitor NFC via relay board)  │
│  - Processa access-attempt / access-result                   │
│  - Controla relé via relay control board                     │
│  - LED branco/verde fixo (porta fechada/aberta)             │
└──────────────────────────┬──────────────────────────────────┘
                           │ door/{id}/enter-enrollment-mode
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  MODO TERMINAL (temporário)                  │
│  - LED azul pulsante (aguardando dedo de enrollment)        │
│  - Ignora tentativas de acesso normais                       │
│  - Captura 2 imagens → createModel() → getModel()           │
│  - Publica door/{id}/enrollment-result                       │
│  - Retorna ao modo fechadura após resultado OU timeout       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Após envio de enrollment-result
                           │ OU door/{id}/cancel-enrollment
                           │ OU expiresAt atingido
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    MODO FECHADURA (padrão)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Decisões Arquiteturais

### Modo dual em vez de dispositivo dedicado

A principal mudança arquitetural é eliminar o conceito de `role = "enrollment_terminal"` na tabela `door_controller`. Todos os controladores têm `role = "door"` e todos são capazes de alternar para o modo terminal. O modo é um **estado de runtime do firmware**, não uma propriedade permanente do dispositivo.

Consequências:
- `roomId` em `door_controller` é **NOT NULL** — todo controlador está associado a uma sala
- Não há mais aba "Terminais" no portal — a seleção de fechadura para enrollment é feita diretamente no drawer de digitais do usuário
- A infraestrutura MQTT é unificada sob o prefixo `door/{id}/` — sem prefixo `enrollment/{terminalId}/`

### Relay control board descartada — módulo relê simples adotado

A **relay control board** adquirida (AliExpress) é um **controlador de acesso autônomo** — não um simples módulo de relê controlado por GPIO. Ela processa impressão digital, NFC e cartão IC internamente e aciona o relê por conta própria.

Interfaces físicas da board:

| Interface | Tipo | Função |
|---|---|---|
| **Fingerprint Interface** | Conector JST 4 pinos (topo centro) | Entrada para ZN-53X — processado internamente pela board |
| **Inductive Interface** | Conector 3 pinos (topo direito) | Leitor NFC/RFID embutido — lógica autônoma interna |
| **Switch Interface** | Conector 2 pinos (lateral direita) | Botão de saída físico — **ponto de integração do ESP8266/ESP32** |
| **Set button** | Botão tátil | Configuração de modo de operação da board |
| **Relay** | TONGLING JQC-T78-DC5V-C | Bobina 5V interna; contatos 20A 125VAC / 20A 14VDC |
| **NO / COM / NC** | Terminais azuis (direita) | Saída do relê — conecta à fechadura solenoide |
| **Power+ / Power−** | Terminais azuis (esquerda) | Alimentação da board — DC 10V–120V |
| **Buzzer** | Piezo integrado | Feedback sonoro acionado pela lógica interna da board |

**O ESP8266/ESP32-CAM não controla o relê diretamente via GPIO.** O relê (TONGLING JQC-T78-DC5V-C, bobina 5V interna) é acionado pela lógica interna da board. A integração correta é via **Switch Interface**: o MCU simula o apertar do botão de saída físico com um pulso curto de ~200ms no GPIO.

```
Integração via Switch Interface:
  ESP8266 GPIO5 (D1) ───► Switch Interface pino 1
  ESP8266 GND        ───► Switch Interface pino 2
  ⚠️  GND DEVE ser comum entre ESP8266 e relay board

Como o pulso funciona:
  Estado de repouso:  GPIO = HIGH  →  "botão solto"
  Pulso de unlock:    GPIO = LOW   →  "botão pressionado" (~200ms)
                      GPIO = HIGH  →  "botão solto" novamente
  A board detecta a transição e aciona o relê internamente.
```

> **Consequência arquitetural importante:** como o relê é acionado **autonomamente** pela board (via biometria/NFC internos), o sistema MQTT via ESP8266 atua como **camada adicional de autorização remota** — não como controlador exclusivo. O acesso físico via credenciais cadastradas na própria board ainda é possível independentemente do ESP8266.
>
> Para o protótipo do TCC, essa limitação é aceitável: o ESP8266 responde ao UNLOCK do backend enviando o pulso, e o acesso presencial via NFC/biometria da board serve como fallback offline.

### `sensorProtocol` como garantia de compatibilidade

O campo `sensorProtocol` em `door_controller` continua sendo o mecanismo que garante compatibilidade de templates entre sensores.

**Regra central:** o backend só sincroniza um template para um controlador se `door_controller.sensorProtocol` corresponde ao `sensorProtocol` do controlador que gerou o template.

Consequências práticas:
- **Troca de hardware futura:** substituir ZN-53X por outro sensor R30x-compatível não exige mudança de código
- **Migração para novo protocolo:** novos controladores com protocolo diferente registram um novo `sensorProtocol`; templates antigos nunca chegam a eles
- **Auditoria:** `enrolledByControllerId` permite rastrear qual fechadura física capturou cada digital

### NFC via leitor standalone direto no NodeMCU

A relay control board possui leitor NFC **embutido com lógica autônoma** — ela é capaz de reconhecer cartões IC sem nenhum microcontrolador externo. Para o sistema ser o ponto de autoridade (e não a board), o ESP32-CAM precisa interceptar a leitura do cartão NFC **antes** do relé ser acionado autonomamente.

Alternativas:
1. **Usar apenas o leitor NFC standalone externo** (o já possuído no inventário) conectado diretamente ao ESP32-CAM via I2C/SPI/UART — mantém o ESP32-CAM como autoridade total. ✅ Recomendado para protótipo.
2. **Usar o NFC da board em modo passivo** — desabilitar a lógica autônoma da board (se houver jumper ou modo de bypass) e fazer o ESP32-CAM processar os UIDs. ⚠️ Requer validação física.
3. **Aceitar o NFC autônomo da board para acesso físico** e apenas logar via ESP32-CAM — simplifica o firmware mas perde controle centralizado de permissões. ❌ Não recomendado para o TCC.

### Segurança durante o modo terminal

Enquanto a fechadura está em modo terminal:
- A porta permanece **no estado atual** (se estava travada, continua travada)
- O relé **não é acionado** por tentativas de acesso que chegarem durante o enrollment
- O TTL garante retorno automático ao modo fechadura mesmo sem resposta da rede

### Offline-first nas fechaduras (HW-008 — ver feature separada)

O matching biométrico já é on-device por natureza (ZN-53X executa `fingerFastSearch()` localmente). A feature HW-008 formaliza a política de quais credenciais permanecem na memória local do sensor quando a capacidade (162 slots) é excedida, e o comportamento quando o broker MQTT está indisponível.

---

## Tópicos MQTT

### Novos tópicos (desta feature)

| Tópico | Direção | Descrição |
|---|---|---|
| `door/{id}/enter-enrollment-mode` | Broker → Device | Entra em modo terminal; payload contém `enrollmentId`, `userId`, `finger`, `expiresAt` |
| `door/{id}/cancel-enrollment` | Broker → Device | Cancela enrollment em andamento e retorna ao modo fechadura |
| `door/{id}/enrollment-result` | Device → Broker | Template capturado (hex) + qualidade + status (`SUCCESS`/`FAILED`/`EXPIRED`) |
| `door/{id}/sync-credentials` | Broker → Device | Envia lista de templates para carregar nos slots do ZN-53X |
| `door/{id}/sync-result` | Device → Broker | Confirma slots carregados (e evictados, quando HW-008 ativo) |
| `door/{id}/delete-credential` | Broker → Device | Remove template de um slot específico do ZN-53X |

### Tópicos existentes (sem alteração)

| Tópico | Direção | Descrição |
|---|---|---|
| `door/{id}/register` | Device → Broker | Registro inicial (já existia) |
| `door/{id}/heartbeat` | Device → Broker | Keep-alive (já existia) |
| `door/{id}/status` | Device → Broker | Estado da porta (já existia) |
| `door/{id}/access-attempt` | Device → Broker | Credencial para acesso (já existia) |
| `door/{id}/access-result` | Broker → Device | Decisão GRANTED/DENIED (já existia) |
| `door/{id}/command` | Broker → Device | UNLOCK/LOCK/SYNC_STATE (já existia) |
| `door/{id}/command-result` | Device → Broker | ACK do comando (já existia) |

---

## Endpoints REST

### Novos endpoints (desta feature)

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/users/:id/fingerprints/enroll-request` | Inicia enrollment — recebe `finger` e `controllerId`; retorna `enrollmentId`; publica MQTT `enter-enrollment-mode` |
| `POST` | `/iot/enrollment/complete` | Chamado pelo broker ao receber `door/{id}/enrollment-result`; persiste template com `enrolledByControllerId`; dispara sync por `sensorProtocol` |
| `GET` | `/iot/enrollment/:id/status` | Polling do portal — retorna `PENDING`, `COMPLETED`, `FAILED` ou `EXPIRED` |

### Endpoints existentes estendidos

| Método | Path | Alteração |
|---|---|---|
| `DELETE` | `/users/:id/fingerprints/:credentialId` | Agora também publica `door/{id}/delete-credential` para todos os controladores com o mesmo `sensorProtocol` |
| `GET` | `/doors` (ou `/iot/devices`) | Deve retornar `sensorProtocol` e `sensorModel` para o seletor de fechaduras no portal |

---

## Schema de Banco — Alterações

### Tabela `door_controller` — revisão dos campos

```sql
-- sensorProtocol e sensorModel: já adicionados anteriormente (ARCH-002)
-- role: campo REMOVIDO ou simplificado — todos os controladores são "door"
--       A alternância para modo terminal é estado de runtime, não propriedade do banco

-- roomId volta a ser NOT NULL (terminais dedicados não existem mais)
ALTER TABLE door_controller
  ALTER COLUMN room_id SET NOT NULL;

-- Campos que permanecem:
--   sensor_protocol TEXT CHECK (sensor_protocol IN ('R30X', 'BOLAND'))
--   sensor_model    TEXT  -- ex: 'ZN-53X', 'A21'
--   (role é removido do schema)
```

> Se o campo `role` já foi adicionado ao banco por migration anterior (ARCH-002),
> deve ser revertido: `ALTER TABLE door_controller DROP COLUMN IF EXISTS role`.
> A constraint `roomId NOT NULL` deve ser restaurada se foi relaxada.

### Tabela `access_credential` — sem alteração nova

O campo `enrolled_by_controller_id` (FK para `door_controller`) já foi definido em ARCH-002.
Continua sendo usado para rastrear qual fechadura realizou o enrollment da credencial.

### Tabela `enrollment_request` — nova

Rastreia enrollments em andamento (TTL curto, ~2 minutos):

```sql
CREATE TABLE enrollment_request (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  finger         finger_key NOT NULL,
  controller_id  UUID NOT NULL REFERENCES door_controller(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | COMPLETED | FAILED | EXPIRED
  expires_at     TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

> `controller_id` refere-se à fechadura que está realizando o enrollment
> (antes era `terminal_id` apontando para um dispositivo dedicado).

### Tabela `controller_credential_slot` — nova

Mapeia qual slot do ZN-53X de cada controlador corresponde a qual credencial:

```sql
CREATE TABLE controller_credential_slot (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id  UUID NOT NULL REFERENCES door_controller(id) ON DELETE CASCADE,
  credential_id  UUID NOT NULL REFERENCES access_credential(id) ON DELETE CASCADE,
  slot_id        SMALLINT NOT NULL,   -- posição no ZN-53X (0–161)
  synced_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at   TIMESTAMP WITH TIME ZONE,
  UNIQUE (controller_id, slot_id),
  UNIQUE (controller_id, credential_id)
);
```

---

## Hardware Utilizado

### Stack completo por fechadura (protótipo atual)

| Componente | Modelo | Status | Função |
|---|---|---|---|
| Microcontrolador | NodeMCU v3 (ESP8266MOD) | ✅ Possuído | Processamento central, Wi-Fi, MQTT, SoftSerial para ZN-53X, I2C para NFC |
| Sensor biométrico | ZN-53X | ✅ Possuído | Captura e matching de impressão digital (protocolo R30x) |
| Leitor NFC standalone | Módulo NFC (já possuído) | ✅ Possuído | Leitura de UIDs NFC via I2C (D7/D3) sob controle direto do NodeMCU |
| Módulo relê simples | 1 canal 5V (optoacoplador) | ❌ A adquirir | Acionamento direto via GPIO5 (D1); ~R$5–10 |
| Reed switch + ímã | Genérico | ❌ A adquirir | Detecção de porta aberta/fechada via GPIO4 (D2) |
| LED RGB (ou 3 LEDs) | Individual | ❌ A adquirir | Feedback visual durante modo terminal e acesso |
| Fechadura solenoide | 12V | ❌ A adquirir | Atuador eletromecânico conectado ao NO/COM do módulo relê |
| Relay control board | AliExpress (descartada) | ✅ Possuído | ⚠️ Não usada no protótipo principal — mantida como referência/failsafe |

### Sobre a Relay Control Board (descartada do protótipo principal)

A board é um **controlador de acesso autônomo** — não um simples módulo de relê. Foi descartada porque intercepta dados do ZN-53X e NFC internamente, impedindo que o backend MQTT seja a autoridade de acesso. Mantida como referência histórica e possível failsafe físico futuro.

| Interface | Tipo | Motivo da incompatibilidade |
|---|---|---|
| **Fingerprint Interface** | Conector JST 4 pinos | Board intercepta stream UART do ZN-53X — MCU não recebe dados do sensor |
| **Inductive Interface** | Conector 3 pinos | Lógica autônoma interna — UID nunca exposto ao MCU |
| **Switch Interface** | Conector 2 pinos | Único ponto de controle externo — apenas simula botão físico, sem feedback real |

Ver análise completa em `.claude/guides/nodemcu-v3-simple-relay-architecture.md`.

### Pinout NodeMCU v3 ↔ ZN-53X (SoftwareSerial direto)

| Pino NodeMCU | Label | Conecta em | Função |
|---|---|---|---|
| GPIO14 | D5 | ZN-53X TX | SoftwareSerial RX — recebe dados do sensor |
| GPIO12 | D6 | ZN-53X RX | SoftwareSerial TX — envia comandos ao sensor |
| 3V3 (ou VIN) | 3V3 | ZN-53X VCC | Alimentação — confirmar se sensor aceita 3.3V ou exige 5V |
| GND | GND | ZN-53X GND | Terra comum |

> Se o ZN-53X operar em lógica 5V, usar divisor de tensão na linha TX do sensor → D5:
> `ZN-53X TX (5V) ── 1kΩ ── D5 (GPIO14) ── 2kΩ ── GND`

### Pinout NodeMCU v3 ↔ Leitor NFC standalone (I2C direto)

| Pino NodeMCU | Label | Conecta em | Função |
|---|---|---|---|
| GPIO13 | D7 | NFC SDA | I2C data |
| GPIO0 | D3 | NFC SCL | I2C clock — GPIO0 é pulled HIGH no boot ✅ compatível com I2C |
| 3V3 | 3V3 | NFC VCC | Alimentação |
| GND | GND | NFC GND | Terra comum |

> Inicializar com `Wire.begin(13, 0)` no ESP8266 (SDA=GPIO13, SCL=GPIO0).
> Protocolo exato (I2C/SPI/UART) a confirmar fisicamente com o modelo do leitor NFC possuído.

### Pinout NodeMCU v3 ↔ Módulo relê simples

| Pino NodeMCU | Label | Conecta em | Função |
|---|---|---|---|
| GPIO5 | D1 | Relê IN | Controle direto — LOW = acionar (UNLOCK); HIGH = liberar (LOCK) |
| VIN | VIN | Relê VCC | 5V do step-down — alimenta a bobina do relê |
| GND | GND | Relê GND | Terra comum |
| — | — | Relê COM | Polo positivo da fechadura solenoide |
| — | — | Relê NO | Polo positivo da fonte 12V |

### Pinout NodeMCU v3 ↔ Reed switch

| Pino NodeMCU | Label | Conecta em | Função |
|---|---|---|---|
| GPIO4 | D2 | Reed switch pino 1 | `INPUT_PULLUP` — LOW = porta fechada (ímã próximo) |
| GND | GND | Reed switch pino 2 | Terra comum |

---

## Critérios de Aceite

- [ ] **CA-01** — Backend publica `door/{id}/enter-enrollment-mode` ao receber `POST /users/:id/fingerprints/enroll-request`
- [ ] **CA-02** — Controlador muda de modo fechadura para modo terminal ao receber `enter-enrollment-mode`
- [ ] **CA-03** — Durante o modo terminal, tentativas de acesso normais são ignoradas e o relé não é acionado
- [ ] **CA-04** — LED azul pulsante é exibido durante o modo terminal (aguardando dedo)
- [ ] **CA-05** — Captura de 2 passagens do dedo gera template via `createModel()` com sucesso
- [ ] **CA-06** — `getModel()` (UploadTemplate 0x08) retorna exatamente 256 bytes do template
- [ ] **CA-07** — Template é publicado em `door/{id}/enrollment-result` como string hex de 512 caracteres
- [ ] **CA-08** — Controlador retorna ao modo fechadura imediatamente após publicar `enrollment-result`
- [ ] **CA-09** — Backend persiste o template em `access_credential.value` com `type = FINGERPRINT` e `enrolledByControllerId` preenchido
- [ ] **CA-10** — Backend dispara `sync-credentials` apenas para controladores com `sensorProtocol` igual ao do controlador de origem
- [ ] **CA-10b** — A própria fechadura que realizou o enrollment também recebe `sync-credentials` e carrega o template em um slot
- [ ] **CA-11** — Controlador carrega o template no ZN-53X via `storeModel()` e registra o slot em `controller_credential_slot`
- [ ] **CA-12** — Após sync, o controlador consegue fazer matching do mesmo dedo com `fingerFastSearch()` retornando `FINGERPRINT_OK` + slotId correto
- [ ] **CA-13** — O slotId é resolvido para `credentialId` → publicado como `access-attempt` → backend retorna `GRANTED` para usuário com permissão
- [ ] **CA-14** — Se o TTL expirar antes da captura, o controlador retorna ao modo fechadura e publica `enrollment-result` com `status: EXPIRED`
- [ ] **CA-15** — Ao receber `door/{id}/cancel-enrollment`, o controlador retorna ao modo fechadura imediatamente
- [ ] **CA-16** — Ao excluir uma credencial no portal, o backend publica `door/{id}/delete-credential` e os controladores removem o slot correspondente
- [ ] **CA-17** — Template duplicado (mesmo dedo passado duas vezes) é rejeitado com 409 Conflict pelo backend
- [ ] **CA-18** — Portal exibe seletor de fechaduras online no drawer de digitais ao clicar em "Cadastrar via Fechadura"
- [ ] **CA-19** — Leitura de cartão NFC pelo leitor standalone retorna UID corretamente ao ESP32-CAM via I2C/SPI/UART
- [ ] **CA-20** — UID NFC lido pelo ESP32-CAM é publicado em `door/{id}/access-attempt` com `credentialType: NFC`
- [ ] **CA-21** — Relay control board aciona o relé corretamente quando o ESP32-CAM envia sinal de controle após decisão GRANTED do backend

---

## Impacto em Features Existentes

### DOOR-001 — Registro e heartbeat de controladores

O payload de `door/{id}/register` deve incluir `sensorProtocol` e `sensorModel` (sem `role`).
O backend persiste esses campos. `roomId` continua NOT NULL.

### UI-019 — Aba "Terminais" em `/rooms`

**Removida.** Não existe mais o conceito de terminal dedicado para listar.
A funcionalidade de enrollment é acessada diretamente no drawer de digitais do usuário:
botão "Cadastrar via Fechadura" com seletor de fechaduras online (filtradas por `sensorProtocol`).

### UI-013 — Drawer de gestão de digitais (`FingerprintHandDrawer`)

Deve ser estendido para:
- Exibir botão "Cadastrar via Fechadura" ao clicar em um dedo não cadastrado
- Mostrar seletor de fechaduras online (query: `GET /doors?online=true`)
- Exibir spinner com countdown do TTL após confirmar
- Confirmar automaticamente quando o polling de `GET /iot/enrollment/:id/status` retornar `COMPLETED`

### ARCH-002 — Decisões de Hardware-Agnostic

O campo `role` definido em ARCH-002 é **revertido**. O campo `roomId` nullable é **revertido para NOT NULL**.
`sensorProtocol` e `sensorModel` permanecem como definido em ARCH-002.

---

## Dependências e Bloqueios

### Depende de
- **HW-001** parcial — firmware base com Wi-Fi + MQTT funcional (já validado nos testes)
- **CRED-001** parcial — schema de `access_credential` e endpoint de registro já existem

### Bloqueia
- **HW-002** — integração biométrica nos controladores depende do formato de template e protocolo de sync definidos aqui
- **CRED-001** completo — o fluxo de cadastro via portal só estará funcional end-to-end após esta feature
- **UI-013** extensão — seletor de fechaduras e polling de enrollment no drawer de digitais

### Não bloqueia (pode ser feito em paralelo)
- PERM-005, LOG-002, UI-010, CRED-002 (NFC), HW-003 (RFID), HW-008 (offline-first)

---

## Notas de Implementação

### NodeMCU v3: mapeamento de GPIOs e restrições

O NodeMCU v3 (ESP8266MOD) possui 11 GPIOs digitais utilizáveis. A alocação do projeto:

| GPIO | Label | Uso | Nível em boot | Observação |
|---|---|---|---|---|
| GPIO0 | D3 | NFC SCL | HIGH (pull-up) | ✅ Compatível com I2C — pulled HIGH em repouso |
| GPIO4 | D2 | Reed switch | Livre | `INPUT_PULLUP` |
| GPIO5 | D1 | Módulo relê | Livre | Inicializar HIGH (trancado) no `setup()` |
| GPIO12 | D6 | ZN-53X RX | Livre | SoftwareSerial TX |
| GPIO13 | D7 | NFC SDA | Livre | I2C data |
| GPIO14 | D5 | ZN-53X TX | Livre | SoftwareSerial RX |
| GPIO15 | D8 | **Não usado** | LOW (obrigatório) | ⚠️ Não usar como SCL — conflito com I2C em repouso |
| GPIO1 | TX | Serial0 debug | — | Não usar para periféricos |
| GPIO3 | RX | Serial0 debug | — | Não usar para periféricos |

GPIOs livres para expansão futura: D0 (GPIO16), D4 (GPIO2), D8 (GPIO15 — com restrição), A0 (ADC analógico).

> O NodeMCU v3 tem USB nativo via CH340 — não precisa de adaptador FTDI para programação.
> Serial de debug disponível diretamente via cabo USB.

### Relay control board — decisão arquitetural documentada

A relay control board foi analisada e descartada do protótipo principal. Os pontos de investigação que motivaram a decisão:

1. **Fingerprint Interface (P4):** a board processa o ZN-53X internamente — o MCU não acessa o stream UART do sensor. Conectar o ZN-53X diretamente ao NodeMCU via SoftwareSerial é a única forma de ter acesso aos dados biométricos
2. **Inductive Interface (NFC):** lógica autônoma interna — o UID nunca é exposto ao MCU. O leitor NFC standalone deve ser conectado diretamente ao NodeMCU via I2C
3. **Switch Interface:** apenas simula um botão físico (pulso LOW ~200ms) — não expõe o estado real da fechadura e não permite controle fino do relê
4. **Conclusão:** com a relay board, o sistema MQTT vira observador passivo. A board substituta (módulo relê simples de 1 canal) garante controle GPIO direto

Ver análise completa e justificativa em `.claude/guides/nodemcu-v3-simple-relay-architecture.md`.

### Compatibilidade do ZN-53X com a biblioteca Adafruit

O ZN-53X e o módulo A21 UART Boland usam o protocolo serial padrão do chip GROW R30x
(start code `0xEF01`, pacotes estruturados com checksum). A biblioteca `Adafruit_Fingerprint`
implementa exatamente este protocolo. A compatibilidade precisa ser **confirmada fisicamente**
como primeiro passo:

```cpp
// Teste mínimo de compatibilidade — NodeMCU v3 via SoftwareSerial
#include <SoftwareSerial.h>
#include <Adafruit_Fingerprint.h>

SoftwareSerial ss(14, 12); // RX=D5 (GPIO14), TX=D6 (GPIO12)
Adafruit_Fingerprint finger(&ss);

void setup() {
  Serial.begin(115200); // debug via USB nativo do NodeMCU
  ss.begin(57600);
  finger.begin(57600);
  if (finger.verifyPassword()) {
    Serial.println("ZN-53X encontrado e respondendo!");
  } else {
    Serial.println("Sensor não encontrado — verificar baudrate e fiação");
  }
}
```

Se `verifyPassword()` falhar, tentar baudrates alternativos: 9600, 115200.

### Extração do template (comando crítico)

O comando `getModel()` (UploadTemplate `0x08`) transfere o template do buffer interno do sensor
para o UART em múltiplos pacotes de dados. A biblioteca Adafruit não encapsula a leitura dos
pacotes subsequentes — será necessário implementar a leitura manual após o ack inicial:

```cpp
// Após createModel():
finger.getModel(); // envia comando UPLOAD
// Ler os data packets manualmente via getStructuredPacket()
// até receber FINGERPRINT_ENDDATAPACKET (0x08)
// Concatenar os bytes de dados de cada pacote
// Resultado: buffer de 256 bytes = template completo
```

O processo invertido (`DownloadTemplate` `0x09`) é usado para carregar o template
recebido do backend de volta no ZN-53X de cada controlador.

### Gerenciamento de slots nos controladores

Cada ZN-53X suporta até 162 templates (slots 0–161). O backend rastreia quais slots estão
ocupados em cada controlador via `controller_credential_slot` e aloca o próximo slot livre
no payload de `sync-credentials`. Quando todos os slots estão cheios, o backend inclui o
campo `evict` no payload indicando qual slot deve ser liberado (política LRU via `lastUsedAt`).
Ver HW-008 para detalhes da política de eviction.

### Leitura NFC via leitor standalone

O leitor NFC standalone possuído deve ser identificado (PN532, MFRC522 ou similar) e a
biblioteca correspondente usada no firmware do NodeMCU v3:

- **PN532 (I2C):** biblioteca `Adafruit_PN532` — inicializar com `Wire.begin(13, 0)` (SDA=D7, SCL=D3); ler UID com `readPassiveTargetID()`
- **MFRC522 (SPI):** biblioteca `MFRC522` — usar GPIOs livres para SPI (SS, RST, MOSI, MISO, SCK); ler UID com `uid.uidByte[]` após `PICC_IsNewCardPresent()`

O UID lido é publicado em `door/{id}/access-attempt` com `credentialType: NFC` e `credentialValue: uid_hex`.
O backend resolve o UID para a credencial cadastrada em `access_credential` (type = NFC).

### Isolamento do modo terminal no firmware

A máquina de estados do firmware deve garantir que:
1. O estado `ENROLLMENT_MODE` tem prioridade sobre eventos de acesso normal
2. Ao entrar em `ENROLLMENT_MODE`, o firmware salva o estado do relé e o restaura ao sair
3. Um watchdog de software garante saída do modo terminal mesmo sem resposta MQTT
4. Interrupções do ZN-53X durante acesso normal não interferem com o processo de enrollment

### Segurança do template em trânsito

O template biométrico trafega em texto no payload MQTT. Para o protótipo do TCC isso é
aceitável, mas a monografia deve documentar que em produção o canal MQTT deve usar TLS
(porta 8883) para proteger os dados biométricos em trânsito.

### O WA26 no contexto atual

O WA26 e o hook `useFingerprintReader` permanecem no codebase para demonstração dos modos
`keyboard` e `hid` na interface web, mas **não participam do fluxo de produção de biometria**.
O cadastro real de digitais passa pela fechadura em modo terminal. Isso deve ser documentado
na monografia como decisão arquitetural motivada pela incompatibilidade de templates entre
fabricantes diferentes (Boland vs. R30x).

### Próximos passos físicos recomendados (em ordem)

1. **Conectar ZN-53X ao NodeMCU v3** via SoftwareSerial (D5/D6) e rodar teste `verifyPassword()` — confirmar baudrate e nível de tensão (3.3V vs 5V)
2. **Identificar modelo do leitor NFC standalone** — fazer I2C scan (`Wire.begin(13, 0)`) para confirmar endereço e biblioteca adequada
3. **Adquirir módulo relê simples 1 canal (5V)** e testar acionamento via GPIO5 (D1) com multímetro nos terminais NO/COM
4. **Montar circuito completo** conforme diagrama em `.claude/guides/nodemcu-v3-simple-relay-architecture.md` e testar periféricos simultâneos (SoftSerial + I2C + relê)
5. **Integrar com MQTT** — testar `door/{id}/heartbeat`, `door/{id}/access-attempt` e `door/{id}/access-result`
6. **Confirmar GPIOs definitivos** e atualizar `config.h` com valores físicos validados