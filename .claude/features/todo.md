# Todo — Sistema de Controle de Acesso IoT

> Última atualização: **INFRA-004** — Migração do frontend de Vite SPA para TanStack Start (SSR). Fumadocs integrado e acessível em `/docs`. Primeira página "Olá Mundo!" funcionando com SSR. Ver `implemented.md` → INFRA-004.
> Última atualização anterior: **HW-BIOMETRIC-ESP8266** — Tutorial de conexão e firmware de teste criados para NodeMCU v3 + ZN-53X + A21 UART. Dois sensores testáveis simultaneamente via `#define DUAL_SENSOR 1`. Ver `.claude/test/esp8266-biometric/`. PERM-005 resolvido; broker IoT corrigido (métodos HTTP, paths, sensorProtocol/sensorModel); checkUserRoomAccess movido para módulo de permissões; seed com controladores. Ver `implemented.md` → PERM-005 e INFRA-IOT-001.
> Última atualização (análise): HW-007-ALT criado — análise de viabilidade do HLK-ZW111 (Hi-Link) como alternativa ao ZN-53X. Ver `.claude/features/HARDWARE/hw-007-alt-hlk-zw111.md`.
> Última atualização (hardware): Hardware real de teste confirmado — ESP32-CAM (AI-Thinker), ZN-53X, relay control board multifuncional (NFC + P4 biometria + relé), leitor NFC standalone. `hw-007-enrollment-terminal.md` e `items.md` atualizados com nova stack de hardware.
> Última atualização (firmware): **HW-007-RELAY-DISCOVERY** — Relay control board confirmada como controlador autônomo. Integração via Switch Interface (pulso GPIO ~200ms). Firmware v0.2.0 atualizado; README e hw-007 revisados. Ver `implemented.md` → HW-007-RELAY-DISCOVERY.
> Última atualização (hardware — NFC): **NFC-DISCOVERY** — Confirmado que o "leitor NFC standalone" **não existe como item independente**: a placa **IC V1.3A** (conector 2 pinos C1/P1) é a **bobina de antena indutiva passiva** do kit da relay control board — sem lógica ou protocolo utilizável pelo ESP8266 isoladamente. Para leitura NFC pelo firmware, é necessário **adquirir um módulo leitor independente (PN532 recomendado)**. `items.md`, `architecture.md` e `nodemcu-v3-simple-relay-architecture.md` atualizados.

> Última atualização anterior: ARCH-003 — modo terminal integrado às próprias fechaduras, sem dispositivo dedicado.

---

## ✅ Tasks concluídas (esta sessão)

### INFRA-004 — Migração para TanStack Start + Fumadocs (Documentação em /docs)

- Migração completa do `app/` de Vite SPA para TanStack Start 1.166 (SSR com Vite nativo, sem Vinxi)
- Criado `src/client.tsx`, `src/server.tsx`, `src/router.tsx` (entry points SSR)
- Layout pathless `_app` para isolar rotas da aplicação do `/docs`
- Fumadocs MDX integrado: `source.config.ts`, `src/lib/source.ts`, `src/lib/mdx-components.tsx`
- Rota `/docs` com `RootProvider` Fumadocs + rota coringa `/docs/$` para páginas MDX
- Primeira página `content/docs/index.mdx` com "Olá Mundo!"
- Correções de SSR: `MobileNavDrawer` (`document`), `Footer` (`window`), loader `/docs/$` (serialização do MDXContent)
- Arquivos auxiliares `types.ts` e `loading.tsx` renomeados com prefixo `-`

### HW-BIOMETRIC-ESP8266 — Tutorial de conexão + firmware de enrollment biométrico no NodeMCU v3 (ZN-53X e A21) com Wi-Fi + MQTT

- [x] **Tutorial de conexão criado** — `.claude/test/esp8266-biometric/README.md` com:
  - Diagrama do fluxo MQTT ponta a ponta (Portal → ESP8266 → Broker → Backend → banco)
  - Mapeamento completo dos 6 fios coloridos do A21 UART Boland (laranja=VCC, preto=GND, amarelo=TX, verde=RX, azul=NC, branco=NC)
  - Mapeamento do ZN-53X por função (cores típicas)
  - Tabelas fio a fio e diagramas ASCII de conexão ao NodeMCU v3
  - Procedimento de verificação de tensão com multímetro antes de conectar (divisor 1kΩ+2kΩ para TX em 5V)
  - Passos de validação incremental: sensor → Wi-Fi → MQTT → enrollment real → verificação no banco
  - Diagnóstico de problemas comuns (sensor, Wi-Fi, MQTT state codes, payload size)
- [x] **Firmware completo criado** — `.claude/test/esp8266-biometric/firmware-biometric-esp8266.ino` com:
  - Wi-Fi (ESP8266WiFi) + MQTT (PubSubClient) + ArduinoJson
  - Sensor único via SoftwareSerial: D5 (GPIO14 RX) / D6 (GPIO12 TX)
  - Detecção automática de baudrate (57600, 9600, 19200, 38400, 115200)
  - Protocolo R30x via `Adafruit Fingerprint Sensor Library >= 2.1.0`
  - Extração do template via `getModel()` + leitura manual dos data packets (256 bytes → hex 512 chars)
  - Publicação do resultado em `enrollment/{CONTROLLER_ID}/result`
  - Registro automático no sistema via `door/{id}/register` no boot
  - Heartbeat periódico a cada 30s via `door/{id}/heartbeat`
  - Enrollment executado no `loop()` (fora do callback MQTT) para não bloquear o PubSubClient durante as capturas
  - LEDs de feedback: azul (aguardando dedo), verde (sucesso), vermelho (erro)
  - `mqtt.setBufferSize(1300)` para comportar o payload de 512 chars hex
- [x] **Broker IoT atualizado** — `tcc/iot/src/index.ts` com:
  - Novo schema `enrollmentResultPayloadSchema`
  - Novo matcher `enrollmentResult: /^enrollment\/([^/]+)\/result$/`
  - Handler `handleEnrollmentResult()` que chama `POST /iot/devices/{id}/enrollment`
  - Persiste apenas status `COMPLETED` com template; loga e descarta `FAILED`/`TIMEOUT`
- [x] **Rota IoT interna criada** — `tcc/server/src/api/routes/iot.ts`:
  - `POST /iot/devices/:controllerId/enrollment` — sem `requireAdmin`, autenticada pelo controllerId
  - Aceita `{ userId, finger, template, enrollmentId? }` no body
  - Chama `registerFingerprint()` com `enrolledByControllerId: controllerId`
  - Retorna 201 em sucesso, 409 em conflito de dedo ou template duplicado
- [x] **Service de fingerprint atualizado** — `tcc/server/src/services/user/fingerprint/register-fingerprint.ts`:
  - Campo `enrolledByControllerId?: string` adicionado ao `RegisterFingerprintInput`
  - Persistido no INSERT via spread condicional

### Correções de bugs + fluxo IoT com sensorProtocol/sensorModel — PERM-005 / INFRA-IOT-001

- [x] **PERM-005 confirmado resolvido** — `processAccessAttempt` já chamava `checkUserRoomAccess` com os 4 níveis; confirmado por leitura do código; bug marcado como fechado
- [x] **ARCH-003 reverter schema confirmado** — código e migration já aplicados pelo usuário; bugs ARCH-003 e ARCH-001 fechados
- [x] **Broker IoT — métodos HTTP corrigidos** — `callApi` refatorado para aceitar `method: HttpMethod` como primeiro argumento; todas as chamadas corrigidas:
  - `handleRegister` → `PUT /iot/devices/:id` (era `POST /iot/devices/register`)
  - `handleHeartbeat` → `PATCH /iot/devices/:id/heartbeat` (era `POST`)
  - `handleStatus` → `PUT /iot/devices/:id/status` (era `POST`)
  - `handleAccessAttempt` → `POST /iot/devices/:id/access-attempts` (plural; era singular)
  - `pollCommands` → `GET /iot/devices/:id/commands?limit=5` (era `POST /...commands/pull`)
  - `handleCommandResult` → `PATCH /iot/devices/:id/commands/:cid/ack` (era `POST`)
  - `enqueueUnlockCommand` → `POST /iot/devices/:id/commands` (já correto, método explicitado)
- [x] **Broker IoT — sensorProtocol e sensorModel** — `registerPayloadSchema` aceita `sensorProtocol` e `sensorModel`; repassados ao backend no `PUT /iot/devices/:id`; logados após registro bem-sucedido
- [x] **Backend IoT — registro aceita sensorProtocol/sensorModel** — `PUT /iot/devices/:id` aceita e persiste `sensorProtocol` (enum R30X/BOLAND) e `sensorModel` (text); `registerControllerResponseSchema` retorna ambos os campos; `bodyExample` e `responseExamples` atualizados
- [x] **Service door-controller.ts** — `registerDoorController` e `recordDoorHeartbeat` passam a ter `returning()` explícito com `sensorProtocol` e `sensorModel`; update no `onConflictDoUpdate` atualiza protocolo/modelo somente se enviado (spread condicional)
- [x] **checkUserRoomAccess movido para permissions/** — extraído de `services/iot/access.ts` para `services/permissions/check-user-room-access.ts`; `access.ts` importa do módulo de permissões; `verify-access.ts` também atualizado para importar do novo local; elimina dependência arquiteturalmente invertida (permissions → iot)
- [x] **Seed com door_controllers** — seed cria 3 controladores por bloco (12 no total) nas primeiras salas, com `sensorProtocol: "R30X"`, `sensorModel: "ZN-53X"`, `firmwareVersion: "1.0.0"` e `lastSeenAt` variado; `db.insert(room)` agora usa `.returning()` para obter IDs
- [x] **Formatação e lint** — `biome format --write` e `biome check --write` aplicados em todos os arquivos modificados do backend; zero erros

---

## ✅ Tasks concluídas (sessão anterior)

### Revisão Arquitetural — Modo Terminal Integrado às Fechaduras — ARCH-003

- [x] **Decisão**: terminais dedicados eliminados — toda fechadura pode alternar entre modo fechadura (padrão) e modo terminal (temporário, TTL ~2 min) via MQTT
- [x] **Schema — revertido `role`**: campo `role` (`"door"` | `"enrollment_terminal"`) removido de `door_controller`; `controllerRoleEnum` removido de `enums.ts`
- [x] **Schema — revertido `roomId` nullable**: `room_id` em `door_controller` volta a ser NOT NULL — todo controlador está associado a uma sala
- [x] **Schema — mantidos `sensorProtocol` e `sensorModel`**: essenciais para compatibilidade de templates entre sensores
- [x] **Schema — mantido `enrolledByControllerId`**: agora referencia a fechadura que realizou o enrollment em modo terminal
- [x] **Tópicos MQTT unificados**: prefixo `enrollment/{terminalId}/...` substituído por `door/{id}/enter-enrollment-mode`, `door/{id}/enrollment-result`, `door/{id}/cancel-enrollment` — tudo sob `door/{id}/`
- [x] **UI-019 redefinida**: aba "Terminais" em `/rooms` removida; substituída por seletor de fechaduras inline no `FingerprintHandDrawer` com dropdown de fechaduras online e countdown do TTL
- [x] **Componentes de aba a remover**: `_tab-terminals.tsx`, referências em `_tabs.tsx`, `types.ts` e `index.tsx`
- [x] **Documentação atualizada**: `hw-007-enrollment-terminal.md` reescrito; `architecture.md` expandido com fluxo de enrollment e modo dual; `index.md` e `implemented.md` atualizados

---

## ✅ Tasks concluídas (sessão anterior)

### Decisões Arquiteturais de Hardware-Agnostic + UI de Terminais — ARCH-002

- [x] **Schema — `door_controller`**: adicionados `role` (enum `"door"` | `"enrollment_terminal"`), `sensorProtocol` (enum `"R30X"` | `"BOLAND"`), `sensorModel` (text livre); `roomId` tornado nullable para suportar terminais sem sala associada
- [x] **Schema — `access_credential`**: adicionado `enrolledByControllerId` (FK para `door_controller`, `ON DELETE SET NULL`) — rastreia qual dispositivo físico capturou cada credencial
- [x] **Schema — `enums.ts`**: adicionados `controllerRoleEnum` e `sensorProtocolEnum` via `pgEnum` do Drizzle
- [x] **Regra de sync por protocolo**: documentado que o backend deve sincronizar templates SOMENTE para controladores com `role = "door"` e `sensorProtocol` igual ao terminal de origem — torna troca de hardware transparente
- [x] **Feature HW-008** criada em `.claude/features/HARDWARE/hw-008-offline-first.md`: política de offline-first com N últimas credenciais, matching local sempre primeiro, eviction por `lastUsedAt`, log offline via LittleFS/Preferences
- [x] **Frontend — aba Terminais**: `TABS` atualizado para incluir `"terminals"` em `types.ts`; `_tabs.tsx` com novo `TabButton`; `_tab-terminals.tsx` criado com tabela, badges de sensor/online, tempo relativo e estado vazio
- [x] **Frontend — query lazy**: `index.tsx` carrega terminais apenas quando aba está ativa (`enabled: activeTab === "terminals"`), filtrando por `role=enrollment_terminal`; campo `isOnline` derivado de `lastSeenAt` < 5 minutos
- [x] **Índice e documentação** atualizados: `index.md` com UI-019 e HW-008; `hw-007-enrollment-terminal.md` com seção de decisões arquiteturais, campos de banco e CA-07b

---

## ✅ Tasks concluídas (sessão anterior)

### Migração de Query Params para nuqs — REFACTOR-002

- [x] `index.tsx` — removidos `validateSearch`, `loaderDeps`, `useDebounce`, `isMounted` ref e `useEffect` de sync; substituídos por `useQueryStates(indexSearchParams)` com `limitUrlUpdates: debounce(400)`
- [x] `users.tsx` — removidos `validateSearch`, `loaderDeps`, `useDebounce`, 2x `useRef` de guard (syncMounted/tabMounted) e 2x `useEffect` de sync; `selectedProfileId` agora é derivado do param; `setActiveTab` faz reset atômico via `setParams`
- [x] `rooms.tsx` — mesma abordagem; removidos `validateSearch`, `loaderDeps`, `useDebounce`, 2x `useRef`, 2x `useEffect`, import desnecessário de `usersQueryOptions`; `selectedTypeId`/`selectedBlockId` derivados dos arrays de params
- [x] Parsers declarativos tipados: `parseAsString`, `parseAsStringLiteral`, `parseAsArrayOf`, `parseAsInteger` com `.withDefault()` eliminam parsing manual
- [x] `clearOnDefault: true` — URLs limpas (ex: `page=1` não aparece na barra de endereço)
- [x] `shallow: false` — nuqs propaga mudanças ao TanStack Router corretamente
- [x] Zero erros TypeScript após refatoração (`tsc --noEmit` limpo)

---

## ✅ Tasks concluídas (sessões anteriores — histórico)

### Refatoração de Performance e Conformidade — REFACTOR-001

- [x] Criado `server/src/lib/require-admin.ts` — helper compartilhado com `resolveSession`, `requireAdmin` e `GuardReply`
- [x] Removidas ~120 linhas de código duplicado (`requireAdmin` local em `user.ts`, `profile.ts`, `room.ts`, `block.ts`)
- [x] `register-fingerprint.ts` — removido SELECT redundante antes do INSERT; banco usa constraint UNIQUE; adicionada `FingerprintDuplicateTemplateError` para template global duplicado
- [x] `list-fingerprints.ts` — `.orderBy(asc(...))` explícito
- [x] `fingerprint-hand-drawer.tsx` — `useQuery` passa a usar `userFingerprintsQueryOptions` centralizado
- [x] `fingerprint-hand-drawer.tsx` — dois `useEffect` de `reader.status` consolidados em um único
- [x] `fingerprint-hand-drawer.tsx` — toast de sucesso removido (violava guideline UX: SVG da mão já mostra o resultado visualmente)
- [x] `verify-access.ts` — corrigido gap de segurança: credencial `isActive=false` agora é rejeitada; projeções explícitas (`select*` → campos específicos); `.limit(1)` adicionado
- [x] `useIsMobile.hook.ts` renomeado para `use-is-mobile.ts` (kebab-case + named export + `ReturnType<typeof setTimeout>`)
- [x] Todos os 110 testes Vitest passando após as mudanças

---

## ✅ Tasks concluídas (sessões anteriores)

### Biometria — CREDENCIAL-001 (frontend + backend)
- [x] `TASK 01+02` — Tipos, constantes e hot-zones de biometria (`app/src/lib/biometrics.ts`)
- [x] `TASK 01` — `HotZoneOverlay` no SVG de mão com acessibilidade e easter egg Halloween
- [x] `TASK 03` — Hook `useFingerprintReader` (modo `keyboard` e `hid`) com countdown 30s
- [x] `TASK 04` — Serviço de API client para digitais (`services/users/fingerprints.ts`)
- [x] `TASK 05` — Endpoints REST no servidor: `GET/POST/DELETE/PATCH /users/:id/fingerprints`
- [x] `TASK 06` — Migração de banco: enum `finger_key` + coluna `finger` em `access_credential`
- [x] `TASK 07` — Serviços de fingerprint no servidor (`list`, `register`, `delete`, `toggle`)
- [x] `TASK 08` — Componente `FingerprintHandDrawer` (drawer, tabs mão D/E, SVG interativo)
- [x] `TASK 09` — Componente `FingerprintCaptureFeedback` (5 estados animados + aria-live)
- [x] `TASK 10` — Item "Gerenciar Digitais" no menu de ações da tabela de usuários
- [x] `TASK 11` — `fingerprintCount` no `UserSummary` (backend + frontend + badge com tooltip)
- [x] `TASK 12` — Invalidação de query ao fechar `FingerprintHandDrawer`
- [x] `TASK 13/14` — Polish: acessibilidade, mensagens de erro, loading states, bug Halloween

### Teste de hardware — ESP32S
- [x] Firmware de teste com MQTT, SCT-013 e botão (simulando reed switch) documentado em `.claude/test/hardware-porta/`
- [x] Protocolo de tópicos MQTT mapeado e validado contra o broker

---

## 🚨 Bugs / Gaps críticos

- [x] **PERM-005** ✅ **RESOLVIDO** — `processAccessAttempt` já chamava `checkUserRoomAccess` com os 4 níveis de permissão. Confirmado por inspeção de código. `checkUserRoomAccess` movido para `services/permissions/check-user-room-access.ts`.

- [x] **ARCH-003 — Reverter schema** ✅ **RESOLVIDO** — `role` removido de `door_controller`; `roomId` restaurado como NOT NULL; aba Terminais removida do frontend; migration gerada e aplicada pelo usuário.

- [x] **ARCH-001** ✅ **DOCUMENTADO** — WA26 descartado do fluxo de produção; cadastro de digitais ocorre via fechadura em modo terminal (ARCH-003). Sem ação pendente no código.

- [x] **INFRA-IOT-001** ✅ **RESOLVIDO** — Broker IoT usava `POST` fixo para todas as chamadas e paths incorretos. Todos os métodos HTTP e paths foram corrigidos para corresponder às rotas reais do backend.

---

## 🔜 Próxima tarefa recomendada

### 0. HW-007 (Pré-passo) — Investigar relay control board (sem MCU, só multímetro)

**Por quê agora?** A relay control board possui lógica interna autônoma. Os resultados desta investigação definem: como o ZN-53X se conecta ao MCU, se o leitor NFC standalone é obrigatório, como o relé será controlado, e — crítico — **qual MCU usar (ESP8266 ou ESP32)**. Nada disso pode ser decidido antes.

**O que fazer:** seguir o guia `.claude/test/relay-board-investigation/README.md` na ordem dos 4 passos:
1. **Passo 1** — Identificar conectores e medir tensões em repouso com multímetro (mapear P4 e NFC pino a pino)
2. **Passo 2** — Verificar se o relé pode ser acionado externamente (testar conector do botão de saída; montar LED de teste no lugar da fechadura)
3. **Passo 3** — Conectar o ZN-53X no P4 e observar se a board envia dados UART para o sensor (P4 passivo vs. ativo)
4. **Passo 4** — Aproximar cartão NFC e medir pinos do conector NFC — verificar se o UID é exposto ou se a board é opaca
5. Preencher a **tabela geral de resultados** no final do README e a **tabela de decisão de arquitetura** (MCU, conexão do ZN-53X, controle do relé)
6. Atualizar `hw-007-enrollment-terminal.md` e `items.md` com os pinos reais e o MCU escolhido

**Arquivos envolvidos:**
- `.claude/test/relay-board-investigation/README.md` ← **guia principal deste passo**
- `.claude/features/HARDWARE/hw-007-enrollment-terminal.md` (atualizar pinout e decisões após o teste)
- `.claude/items.md` (confirmar MCU escolhido, remover ou manter ESP32-CAM)

---

### 0.5 — Testar controle do relé com ESP8266 via MQTT (Switch Interface)

**Por quê agora?** Antes de envolver o ZN-53X ou o NFC, é preciso confirmar que o ESP8266 consegue se comunicar com o broker MQTT e acionar o relé da board via Switch Interface. É o teste mais simples possível — sem biometria, sem NFC — e valida toda a camada de conectividade Wi-Fi + MQTT + sinal de unlock de uma vez.

**Descoberta importante:** a relay control board é um **controlador autônomo** — o relé é acionado internamente pela board. O ESP8266 **não controla o relé diretamente por GPIO**; a integração correta é simular o botão de saída físico via **Switch Interface** (pulso de ~200ms). Firmware e README já foram atualizados para refletir isso (v0.2.0).

**Depende de:** identificar fisicamente os pinos do Switch Interface na board (teste manual com jumper antes de conectar o ESP8266).

**O que fazer:** seguir o guia `.claude/test/esp8266-relay/README.md` na ordem:
1. **Teste 0 (manual, sem ESP8266):** curto-circuitar os 2 pinos do Switch Interface com um jumper — confirmar que o relé aciona (clique audível + LED da board muda)
2. Configurar o Arduino IDE para o ESP8266 (instalar pacote + bibliotecas PubSubClient e ArduinoJson)
3. Montar o LED de teste nos terminais COM/NO do relé (para visualizar acionamento)
4. Conectar `GPIO5 (D1)` → Switch Interface pino 1; `GND` → Switch Interface pino 2 + GND da board
5. Conectar `GPIO4 (D2)` ao botão/reed switch simulando estado da porta
6. Editar `WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_SERVER` e `ROOM_ID` no firmware (v0.2.0)
7. Carregar o firmware e abrir o Serial Monitor (115200 baud)
8. Confirmar Wi-Fi + MQTT conectados, registro enviado e "Modo: pulso via Switch Interface"
9. Enviar comando UNLOCK via `mosquitto_pub` e verificar Serial: `[RELAY] Pulso enviado (200ms)`
10. Confirmar que o relé da board aciona após o pulso e que o LED de teste acende
11. Preencher a tabela de validações no README (incluindo seção "Switch Interface")

**⚠️ GND comum é obrigatório:** sem o GND compartilhado entre ESP8266 e relay board, o sinal do Switch Interface não tem referência e o relé não aciona. Este é o erro mais comum nesta etapa.

**Arquivos envolvidos:**
- `.claude/test/esp8266-relay/README.md` ← **guia principal deste passo** (atualizado — v0.2.0)
- `.claude/test/esp8266-relay/firmware-relay-esp8266.ino` ← firmware do ESP8266 (v0.2.0 — usa Switch Interface)

---

### 1. HW-007 (Passo 1) — Validar compatibilidade física do ZN-53X com o MCU escolhido

**Depende de:** Pré-passo 0 concluído — MCU definido e pinout do P4 mapeado.

**Por quê agora?** É o pré-requisito de toda a arquitetura biométrica. Se o ZN-53X não responder ao protocolo R30x da biblioteca Adafruit, o fluxo de enrollment não funciona independente do MCU.

**O que fazer:**
1. Montar o circuito com o MCU escolhido (ESP32S recomendado por ter micro-USB e UART2 livre) + ZN-53X:
   - **Se ESP32S:** UART2 nos GPIO16 (RX) / GPIO17 (TX) — firmware já está configurado para isso
   - **Se ESP8266:** UART0 nos GPIO3 (RX) / GPIO1 (TX) — adaptar firmware e desabilitar Serial Monitor ou usar `Serial.swap()`
   - **Se P4 passivo (Cenário A):** conectar os pinos TX/RX do P4 nos GPIOs do MCU, passando pela board
   - **Se P4 ativo (Cenário B):** conectar o ZN-53X diretamente no MCU, ignorando o P4
2. Carregar o firmware `.claude/test/enrollment-terminal/firmware-enrollment-test.ino` (ajustar `SENSOR_RX_PIN` / `SENSOR_TX_PIN` conforme o MCU)
3. Verificar no Serial Monitor se `verifyPassword()` retorna `FINGERPRINT_OK`
4. Testar baudrates alternativos se necessário: 57600 (padrão), 9600, 115200
5. Registrar o baudrate que funcionou e os primeiros bytes do template
6. Preencher a tabela de validações no `README.md` do teste

**Arquivos envolvidos:**
- `.claude/test/enrollment-terminal/firmware-enrollment-test.ino` (ajustar pinos conforme MCU e Cenário do P4)
- `.claude/test/enrollment-terminal/README.md` (guia de execução — preencher tabela de validações)

---

### 2. HW-007 (Passos 2–6) — Validar fluxo completo de enrollment em modo terminal (ESP32-CAM)

**Depende de:** HW-007 Passo 1 (compatibilidade ZN-53X) concluído com sucesso + schema revertido (tarefa 0)

**O que fazer — firmware:**
1. Passo 2: captura de 2 passagens e `createModel()`
2. Passo 3: extração de 256 bytes via `getModel()` (UploadTemplate 0x08)
3. Passo 4: transmissão do template via MQTT `door/{id}/enrollment-result`
4. Passo 5: download do template de volta para o ZN-53X (`storeModel`)
5. Passo 6: matching local com `fingerFastSearch()` após sincronização
6. Implementar máquina de estados modo fechadura ↔ modo terminal no firmware

**Novos componentes de backend necessários (implementar durante este passo):**
- Endpoint `POST /users/:id/fingerprints/enroll-request` — cria `enrollment_request`, publica `door/{id}/enter-enrollment-mode`
- Endpoint `POST /iot/enrollment/complete` — recebe resultado da fechadura, persiste credencial com `enrolledByControllerId`, dispara sync por `sensorProtocol`
- Endpoint `GET /iot/enrollment/:id/status` — polling do portal (`PENDING`/`COMPLETED`/`FAILED`/`EXPIRED`)
- Handler MQTT `door/{id}/enter-enrollment-mode` no broker (publicar ao dispositivo)
- Handler MQTT `door/{id}/cancel-enrollment` no broker
- Handler MQTT `door/{id}/enrollment-result` no broker (receber template, chamar backend)
- Handler MQTT `door/{id}/sync-credentials` no broker (distribuir templates)
- Handler MQTT `door/{id}/sync-result` no broker (confirmar slots)
- Migração: tabela `enrollment_request` no banco (`controller_id` NOT NULL — não `terminal_id`)
- Migração: tabela `controller_credential_slot` no banco (incluindo `last_used_at` para HW-008)

**Arquivos envolvidos:**
- `.claude/test/enrollment-terminal/firmware-enrollment-test.ino`
- `iot/src/index.ts` (novos handlers MQTT)
- `server/src/api/routes/` (novos endpoints)
- `server/src/db/schema/` (novas tabelas)

---

### 3. UI-019 — Seletor de fechadura no `FingerprintHandDrawer`

**Depende de:** tarefa 0 (revert ARCH-002 no frontend) + endpoints de enrollment no backend (tarefa 3)

**O que fazer:**
1. Adicionar botão "Cadastrar via Fechadura" no drawer ao clicar em dedo não cadastrado
2. Exibir dropdown com fechaduras online — query `GET /doors?online=true` (ou derivar de `lastSeenAt < 5min`)
3. Exibir spinner com countdown do TTL (2 minutos) após confirmar
4. Polling de `GET /iot/enrollment/:id/status` a cada 3s até `COMPLETED`/`FAILED`/`EXPIRED`
5. Confirmação automática com animação de sucesso no SVG da mão
6. Tratar timeout exibindo mensagem amigável com opção de repetir

**Arquivos envolvidos:**
- `app/src/components/users/fingerprint-hand-drawer.tsx`
- `app/src/services/users/fingerprints.ts` (novos métodos de enrollment)

---

### 4. LOG-002 — Endpoint de histórico de acessos

**Por quê?** Bloqueia UI-010 (página de histórico) e é essencial para auditoria do TCC.

**O que fazer:**
1. Criar rota `GET /access-logs` em `server/src/api/routes/` (ou no arquivo existente de iot/logs)
2. Suportar filtros: `roomId`, `userId`, `status` (GRANTED/DENIED), `from`, `to`, `limit`, `offset`
3. Retornar: `id`, `userId`, `userName`, `roomId`, `roomName`, `status`, `reason`, `credentialType`, `createdAt`
4. Proteger com `requireAdmin`
5. Documentar no Swagger

**Arquivos envolvidos:**
- `server/src/api/routes/` (novo arquivo ou adicionar em rota existente)
- `server/src/db/schema/access.ts` (schema já existe)

---

### 5. UI-010 — Página de histórico de acessos

**Depende de:** LOG-002

**O que fazer:**
1. Criar rota `/access-logs` no TanStack Router
2. Tabela filtrável: por sala, usuário, status e período
3. Colunas: usuário, sala, status (badge colorido), tipo de credencial, data/hora
4. Paginação (ou scroll infinito)
5. Exportar CSV (opcional para TCC)

---

### 6. HW-001 — Modularizar firmware base no `core/`

**Por quê?** O firmware de teste está documentado mas não no projeto. Necessário para a monografia.

**O que fazer:**
1. Inicializar projeto PlatformIO em `core/`
2. Criar estrutura modular: `main.cpp`, `config.h`, `mqtt_handler`, `wifi_manager`, `lock_controller`
3. Portar código de teste (`.claude/test/hardware-porta/`) para estrutura modular
4. Adicionar suporte a OTA updates e watchdog timer
5. Testar contra o broker com o ESP32S físico

---

### 7. CRED-002 — Endpoints de cadastro de NFC_TAG por usuário

**Por quê?** Necessário para o fluxo completo de credenciais RFID.

**O que fazer:**
1. Reutilizar estrutura dos endpoints de fingerprint em `user.ts`
2. Criar endpoints: `GET/POST/DELETE/PATCH /users/:id/nfc-tags`
3. Campo `value` = UID do cartão (string hex, ex: `"A1B2C3D4"`)
4. Validar unicidade global do UID
5. Adicionar UI de cadastro de NFC (UI-012) após isso

---

## 📋 Pendências gerais (backlog)

### Backend
- [ ] ROOM-005 — CRUD completo de tipos de sala (criar, atualizar, excluir)
- [ ] Paginação nas listagens de usuários e logs
- [ ] Rate limiting nas rotas de autenticação

### Frontend
- [ ] UI-011 — CRUD de tipos de sala na interface admin (depende de ROOM-005)
- [ ] UI-012 — Gestão de credenciais NFC por usuário (depende de CRED-002)
- [ ] UI-015 — Badges de perfis na tabela de listagem de usuários
- [ ] UI-016 — Monitoramento em tempo real do estado das salas (WebSocket ou polling curto)
- [ ] UI-017 — Paginação nas tabelas de admin
- [ ] UI-018 — Navbar sticky

### Hardware / Firmware
- [ ] HW-007 — Modo terminal de enrollment nas próprias fechaduras (pré-requisito de HW-002)
  - Passo 1: compatibilidade R30x — **fazer primeiro** (montar ESP32S + ZN-53X, testar `verifyPassword()`)
  - Passos 2–6: captura, extração de template, modo terminal no firmware, sync MQTT
  - Máquina de estados modo fechadura ↔ modo terminal no firmware (ARCH-003)
- [ ] HW-002 — Integração com sensor biométrico ZN-53X nos controladores de acesso
  - Depende de HW-007 para definição do formato de template e protocolo de sync
  - Fluxo: recebe `door/{id}/sync-credentials` → `storeModel()` → `fingerFastSearch()` → resolve credentialId → `access-attempt`
- [ ] HW-003 — Integração com leitor RFID RC522 no firmware
- [ ] HW-004 — Controle do relé da fechadura solenoide (após aquisição do hardware)
- [ ] HW-005 — Reed switch real (substituir simulação por botão)
- [ ] HW-006 — Protocolo de reconexão e fallback offline no firmware

### Backend — novos (desbloqueados por HW-007 / ARCH-003)
- [x] ~~Reverter schema ARCH-002~~ — concluído
- [x] ~~`PUT /iot/devices/:id` — aceitar `sensorProtocol` e `sensorModel`~~ — concluído
- [x] ~~Broker — repassar `sensorProtocol`/`sensorModel` sem `role`~~ — concluído
- [ ] Endpoint `GET /doors` — aceitar `?online=true` para filtrar fechaduras recentemente ativas (para seletor no drawer de digitais)
- [ ] Migração: tabela `enrollment_request` (`controller_id` NOT NULL → fechadura em modo terminal)
- [ ] Migração: tabela `controller_credential_slot` (mapeia slotId → credentialId por controlador, inclui `last_used_at` para eviction HW-008)
- [ ] Endpoint `POST /users/:id/fingerprints/enroll-request` — cria `enrollment_request`, publica `door/{id}/enter-enrollment-mode`
- [ ] Endpoint `POST /iot/enrollment/complete` — persiste template com `enrolledByControllerId`; dispara `door/{id}/sync-credentials` por `sensorProtocol`
- [ ] Endpoint `GET /iot/enrollment/:id/status` — polling do portal (`PENDING`/`COMPLETED`/`FAILED`/`EXPIRED`)
- [ ] Endpoint `DELETE /users/:id/fingerprints/:credentialId` — estender para disparar `door/{id}/delete-credential` para todos os controladores com mesmo `sensorProtocol`
- [ ] Endpoint `PATCH /iot/devices/:id/credential-used` — atualiza `last_used_at` em `controller_credential_slot` (HW-008)
- [ ] Endpoint `POST /iot/offline-log` — recebe tentativas offline e persiste no `access_log` com `reason = WAS_OFFLINE` (HW-008)

### IoT / Broker MQTT — novos (desbloqueados por HW-007 / ARCH-003 e HW-008)
- [ ] Handler `door/{id}/enter-enrollment-mode` (publica comando à fechadura; gerado pelo backend via `POST /users/:id/fingerprints/enroll-request`)
- [ ] Handler `door/{id}/cancel-enrollment` (cancela enrollment em andamento)
- [ ] Handler `door/{id}/enrollment-result` (recebe template capturado; chama `POST /iot/enrollment/complete`)
- [ ] Handler `door/{id}/sync-credentials` (distribui templates; inclui `evict` quando slots cheios — HW-008)
- [ ] Handler `door/{id}/sync-result` (confirma slots carregados e evictados)
- [ ] Handler `door/{id}/delete-credential` (remove template de slot específico)
- [ ] Handler `door/{id}/credential-used` (notifica uso de credencial para atualizar `lastUsedAt`)
- [ ] Handler `door/{id}/offline-log` (recebe log de acessos ocorridos offline)

### Frontend — novos (desbloqueados por ARCH-003 / UI-019 redefinida)
- [ ] **[PRIORITÁRIO]** Reverter aba Terminais no frontend (remover `_tab-terminals.tsx`, `"terminals"` em `types.ts`, `TabButton` em `_tabs.tsx`, query lazy em `index.tsx`)
- [ ] UI-019: botão "Cadastrar via Fechadura" no `FingerprintHandDrawer` com dropdown de fechaduras online
- [ ] UI-019: spinner com countdown do TTL (2 min) após confirmar enrollment
- [ ] UI-019: polling de `GET /iot/enrollment/:id/status` a cada 3s e confirmação automática
- [ ] UI-019 futuro: ao clicar em uma fechadura na listagem de salas, exibir side panel com credenciais sincronizadas e status dos slots

### Hardware pendente de aquisição
- [ ] Fechadura solenoide 12V (conecta ao relé NO/NC da relay control board — item mais crítico)
- [ ] Fonte 12V / 2A (alimentar relay board e fechadura — board aceita DC 10V–120V direto)
- [ ] Regulador step-down (12V → 5V/3.3V para alimentar ESP32-CAM sem USB)
- [ ] Sensor reed switch + ímã (detectar estado real da porta)
- [ ] LEDs RGB e buzzer para feedback ao usuário (modo terminal e acesso)
- [ ] Diodo de proteção 1N4007 (verificar primeiro se relay board já possui proteção interna)

### Infraestrutura
- [ ] INFRA-004 — Monitoramento de logs em produção (Loki + Grafana ou similar)

### Testes físicos pendentes
- [ ] **[PASSO 0 — PRIMEIRO]** Executar os 4 passos de `.claude/test/relay-board-investigation/README.md` — mapear P4, verificar controle externo do relé, comportamento com ZN-53X e exposição de UID NFC; preencher tabela de resultados e decidir MCU
- [ ] **[PASSO 0.5 — APÓS PASSO 0]** Testar controle do relé com ESP8266 via MQTT — ver `.claude/test/esp8266-relay/README.md`; validar Wi-Fi + MQTT + acionamento físico do relé + detecção de estado da porta
- [ ] **[PASSO 1 — APÓS PASSO 0.5]** Validar compatibilidade ZN-53X com protocolo R30x via MCU escolhido — ver `.claude/test/enrollment-terminal/README.md` Passo 1
- [ ] **[NFC — AQUISIÇÃO OBRIGATÓRIA]** Adquirir módulo leitor NFC independente para o NodeMCU v3:
  - A placa IC V1.3A (conector C1/P1) é apenas a **bobina de antena passiva** da relay board — não possui lógica utilizável pelo firmware isoladamente
  - **PN532 recomendado** (I2C, 3,3V, biblioteca `Adafruit_PN532`) — buscar `"módulo PN532 NFC"` no Mercado Livre / Shopee (~R$15–25); confirmar jumpers para modo I2C na descrição do produto
  - Alternativa: **MFRC522** (SPI, 3,3V, ~R$8–12) — mais barato, porém usa pinos SPI (D5/D6/D7/D8) que conflitam com o ZN-53X no pinout atual; exigiria realocação de GPIOs
  - Ver análise completa em `.claude/guides/nodemcu-v3-simple-relay-architecture.md` (Seção 7 e Passo 2)
- [ ] **[NFC — PÓS-AQUISIÇÃO]** Validar leitura de UID com o módulo adquirido:
  - PN532: executar scan I2C (`Wire.begin(13, 0)`) e confirmar endereço `0x24`; depois executar sketch de leitura passiva e aproximar tag NFC
  - Ver sketch de teste completo em `.claude/guides/nodemcu-v3-simple-relay-architecture.md` (Passo 2)
- [ ] Mapear e documentar GPIOs definitivos do NodeMCU v3 para cada periférico (ZN-53X, módulo NFC a adquirir, LEDs, controle do relé)
- [ ] Executar Passos 2–6 do guia de enrollment e preencher tabela de validações
- [ ] Validar alternância de modo fechadura → modo terminal ao receber `door/{id}/enter-enrollment-mode` e retorno após `enrollment-result`
- [ ] Validar que `sensorProtocol = "R30X"` e `sensorModel` são publicados corretamente no payload de `door/{id}/register`
- [ ] Validar que tentativas de acesso normais são ignoradas enquanto a fechadura está em modo terminal
- [ ] WA26: identificar `vendorId`/`productId` reais (somente para demonstração do hook — não entra no fluxo de produção)
- [ ] Testar rejeição de template duplicado (409 Conflict) via modo terminal
- [ ] Testar timeout do modo terminal: verificar retorno automático ao modo fechadura e publicação de `enrollment-result` com `status: EXPIRED`
- [ ] Testar modo offline: desligar broker MQTT com usuário na frente da fechadura; verificar concessão local e log offline
- [ ] Testar eviction: preencher os 162 slots do ZN-53X e verificar que o backend evicta corretamente o slot com `lastUsedAt` mais antigo