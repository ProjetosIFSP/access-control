# Histórico de Implementações

Registro consolidado de todas as tasks implementadas, com ID, descrição e ações tomadas.

---

## INFRA-001 — Docker Compose (local e produção)

**Ações tomadas:**
- Criados `docker-compose.local.yml` e `docker-compose.prod.yml` com serviços: `server`, `iot`, `app`, `postgres`
- Variáveis de ambiente separadas por ambiente
- `docker-compose.yml` base com configurações compartilhadas

---

## INFRA-002 — CI/CD via GitHub Actions + GHCR

**Ações tomadas:**
- Workflow em `.github/workflows/` para build e push de imagens Docker ao GitHub Container Registry (GHCR)
- Trigger em push para branch `main`
- Imagens tagueadas com SHA do commit e `latest`

---

## INFRA-003 — Script de deploy automatizado

**Ações tomadas:**
- Criado `deploy.sh` na raiz do projeto
- Pull das imagens do GHCR + restart dos serviços via `docker compose up -d`

---

## AUTH-001 — Autenticação via cookie (better-auth)

**Ações tomadas:**
- Configurado `better-auth` em `server/src/lib/auth.ts`
- Rotas montadas em `server/src/api/routes/auth.ts`: sign-in, sign-out, session, /me
- Cookie de sessão HttpOnly gerado no login
- Guard `requireAdmin` implementado como helper reutilizável em rotas protegidas

---

## AUTH-002 — Redefinição de senha (forgot/reset)

**Ações tomadas:**
- Fluxo completo com geração de token temporário
- Rotas `POST /auth/forgot-password` e `POST /auth/reset-password`
- Páginas de frontend: `/forgot-password` e `/reset-password` (`app/src/routes/`)

---

## USER-001 — CRUD de usuários

**Ações tomadas:**
- Serviços em `server/src/services/user/`: `create-user.ts`, `get-user.ts`, `update-user.ts`, `delete-user.ts`
- Rotas REST em `server/src/api/routes/user.ts` com schemas Zod e documentação Swagger
- `isAdmin` verificado server-side em todas as rotas de escrita

---

## USER-002 — Relações do usuário

**Ações tomadas:**
- Endpoint `GET /users/:id/relations` retornando perfis, permissões diretas de sala e por tipo de sala
- JOIN com tabelas `user_profile`, `user_room_permission`, `user_room_type_permission`

---

## ROOM-001 — CRUD de blocos

**Ações tomadas:**
- Serviços e rotas para `block`: criar, listar, atualizar, excluir
- Rota em `server/src/api/routes/block.ts`

---

## ROOM-002 — CRUD de salas

**Ações tomadas:**
- Serviços e rotas para `room`: criar, listar, atualizar, excluir
- Rota em `server/src/api/routes/room.ts`
- Campos: `name`, `blockId`, `roomTypeId`, `capacity`, `description`

---

## ROOM-003 — Relações da sala

**Ações tomadas:**
- Endpoint `GET /rooms/:id/relations` retornando perfis com acesso e usuários com permissão direta

---

## ROOM-004 — Listagem de tipos de sala

**Ações tomadas:**
- Endpoint `GET /room-types` em `server/src/api/routes/room-types.ts`
- Retorna id e nome de cada tipo

---

## PROF-001 — CRUD de perfis de acesso

**Ações tomadas:**
- Serviços em `server/src/services/profile/`
- Rotas em `server/src/api/routes/profile.ts`: criar, listar, atualizar, excluir

---

## PROF-002 — Relações do perfil

**Ações tomadas:**
- Endpoint `GET /profiles/:id/relations` retornando usuários vinculados, salas e tipos de sala com permissão

---

## PERM-001 a PERM-004 — Sistema de permissões em 4 níveis

**Ações tomadas:**
- Tabelas no schema: `user_room_permission`, `user_room_type_permission`, `profile_room_permission`, `profile_room_type_permission`
- Endpoints REST de atribuição/remoção em `server/src/api/routes/permissions.ts`
- Serviço `verifyAccess(userId, roomId)` em `server/src/services/permissions/verify-access.ts` que verifica os 4 níveis em cascata
- Formulário de usuário e perfil no frontend com `MultiSelect`, `readonlyBadges` e tooltips de deduplicação visual

---

## LOG-001 — Registro de log de acessos

**Ações tomadas:**
- Tabela `access_log` no schema com campos: `userId`, `roomId`, `controllerId`, `status` (GRANTED/DENIED), `reason`, `credentialType`, `createdAt`
- Populada automaticamente em `processAccessAttempt` após cada tentativa de acesso via MQTT

---

## DOOR-001 — Registro e heartbeat de controladores

**Ações tomadas:**
- `PUT /iot/devices/:id` — registra ou atualiza controlador com `roomId` e `firmwareVersion`
- `PATCH /iot/devices/:id/heartbeat` — atualiza `lastSeenAt`
- Serviço em `server/src/services/iot/door-controller.ts`

---

## DOOR-002 — Atualização de status de porta

**Ações tomadas:**
- `PUT /iot/devices/:id/status` — atualiza `doorState` (OPEN/CLOSED) e `isLocked`
- Chamado pelo broker MQTT ao receber tópico `door/{id}/status`

---

## DOOR-003 — Fila de comandos

**Ações tomadas:**
- Endpoints: criar comando, pull de pendentes, ACK de execução
- Tipos de comando: `UNLOCK`, `LOCK`, `SYNC_STATE`
- Status: `PENDING`, `DELIVERED`, `EXECUTED`, `EXPIRED`
- Expiração automática baseada em `expiresAt`
- Serviço em `server/src/services/iot/commands.ts`

---

## MQTT-001 a MQTT-011 — Broker MQTT completo

**Ações tomadas:**
- Broker Aedes em `iot/src/index.ts` com listeners TCP (1883) e WebSocket (9001)
- Handler para todos os tópicos: `register`, `heartbeat`, `status`, `access-attempt`, `access-result`, `command`, `command-result`
- Polling de comandos pendentes por controlador com intervalo configurável
- Enfileiramento automático de `UNLOCK` após decisão `GRANTED`
- Comunicação com backend via HTTP (undici)
- Logs estruturados com Pino

---

## UI-001 — Página pública de listagem de salas

**Ações tomadas:**
- Rota `/` em `app/src/routes/index.tsx`
- Salas agrupadas por bloco
- Filtros: busca por nome, tipo de sala, estado da porta (aberta/fechada)
- Cards com estado da porta, usuário atual e último usuário (visível apenas para autenticados)

---

## UI-002 — Cards de sala com informações condicionais

**Ações tomadas:**
- `currentUser` e `lastUser` visíveis apenas para usuários autenticados
- Badge de estado da porta (aberta/fechada/desconhecida) com cor semântica

---

## UI-003 — Página `/users` (admin)

**Ações tomadas:**
- Split-view: lista à esquerda, painel de edição à direita
- Busca local com debounce
- Pré-carregamento de dados de relações ao abrir painel
- Dialog de confirmação de exclusão
- Rota em `app/src/routes/users.tsx`

---

## UI-004 — Página `/profiles` (admin)

**Ações tomadas:**
- Split-view com busca
- Formulário de perfil com `MultiSelect` para tipos de sala e salas diretas
- `readonlyBadges` com tooltips explicativos (`ProfileTooltipContent`, `RoomTypeTooltipContent`)

---

## UI-005 — Página `/rooms` (admin)

**Ações tomadas:**
- Split-view com abas: Salas / Blocos
- CRUD de salas com seleção de bloco e tipo
- CRUD de blocos

---

## UI-006 — Formulário de usuário com permissões

**Ações tomadas:**
- Seleção de perfis, tipos de sala e salas diretas
- Deduplicação visual: salas já cobertas por perfil ou tipo de sala aparecem como `readonlyBadge` com tooltip explicativo
- Evita concessão redundante de permissões

---

## UI-007 — Formulário de perfil com permissões

**Ações tomadas:**
- Seleção de tipos de sala e salas diretas
- Badges readonly para salas cobertas pelo tipo selecionado

---

## UI-008 — Componente `MultiSelect` avançado

**Ações tomadas:**
- Props `readonlyBadges` para exibir itens sem botão de remoção
- Tooltips com delay de 300ms mostrando origem da permissão
- Componentes de tooltip: `ProfileTooltipContent`, `RoomTypeTooltipContent`

---

## UI-009 — Páginas de recuperação de senha

**Ações tomadas:**
- `/forgot-password` — formulário de email + chamada à API
- `/reset-password` — formulário de nova senha com token na URL
- Rotas em `app/src/routes/`

---

## UI-013 — Drawer de gestão de digitais (`FingerprintHandDrawer`)

**Ações tomadas:**
- Componente em `app/src/components/users/fingerprint-hand-drawer.tsx`
- Drawer abre de baixo, estilo "gaveta de sala" com handle e sombra interna
- Tabs Mão Direita / Esquerda com contagem de digitais por mão
- SVG interativo da mão com `HotZoneOverlay` (botões acessíveis por teclado sobre cada dedo)
- Highlight verde para digitais cadastradas, azul para dedo selecionado
- Auto-registro: captura template via hook e envia para a API automaticamente
- Lista de digitais cadastradas com botão de remoção individual (loading state por item)
- Skeleton durante carregamento das digitais existentes

---

## UI-014 — Badge de contagem de digitais na tabela de usuários

**Ações tomadas:**
- `server/src/services/user/get-user.ts`: subquery SQL conta `fingerprintCount` por usuário
- `userSummarySchema` atualizado com `fingerprintCount: z.number()`
- `app/src/components/users/users-table.tsx`: ícone `Fingerprint` roxo + badge numérico + tooltip
- Invalidação automática do cache ao fechar o `FingerprintHandDrawer`

---

## CRED-001 — Gestão de credenciais físicas — FINGERPRINT (parcial)

**Ações tomadas:**

### Banco de dados
- `server/src/db/schema/enums.ts`: adicionado `fingerKeyEnum` com 10 valores (`right_thumb`, `right_index`, ..., `left_pinky`)
- `server/src/db/schema/access.ts`: coluna `finger: fingerKeyEnum` nullable em `access_credential`
- `server/.migrations/0001_add_finger_to_access_credential.sql`: migração executada

### Serviços de fingerprint no servidor
- `server/src/services/user/fingerprint/list-fingerprints.ts`: lista credentials `FINGERPRINT` de um usuário
- `server/src/services/user/fingerprint/register-fingerprint.ts`: insere credential validando unicidade por usuário+dedo e unicidade global do template (UNIQUE no campo `value`)
- `server/src/services/user/fingerprint/delete-fingerprint.ts`: remove e ativa/desativa credential com verificação de propriedade

### Endpoints REST
- `GET /users/:id/fingerprints` — lista digitais (200)
- `POST /users/:id/fingerprints` — cadastra digital (201 / 409 Conflict)
- `DELETE /users/:id/fingerprints/:credentialId` — remove digital (204 / 404)
- `PATCH /users/:id/fingerprints/:credentialId` — ativa/desativa digital (200 / 404)
- Todos protegidos por `requireAdmin`, documentados no Swagger

### Hook de leitura do leitor físico
- `app/src/hooks/use-fingerprint-reader.ts`: suporte a modo `keyboard` (WA26 emula teclado) e `hid` (Web HID API)
- Countdown regressivo de 30s, estados tipados, mensagens de erro amigáveis
- `vendorId`/`productId` do WA26 pendentes de identificação física

### Componente de feedback visual
- `app/src/components/users/fingerprint-capture-feedback.tsx`: 5 estados animados (`idle`, `waiting`, `reading`, `success`, `error`)
- `aria-live="polite"` para acessibilidade com screen readers

### Tipos e constantes
- `app/src/lib/biometrics.ts`: `FingerKey`, `FINGER_LABELS`, `FINGERS_RIGHT/LEFT`, hot-zones SVG por mão, helpers `isFingerRegistered`, `getFingerprintForFinger`, `countRegisteredInSet`

### SVG de mão
- `app/src/assets/vectors/hand.tsx`: `HotZoneOverlay` com `<button>` acessível por teclado sobre cada dedo, highlight verde (cadastrado) e azul (selecionado), prop `interactive`, easter egg Halloween corrigido

---

## HW-001 (teste) — Firmware de teste ESP32S

**Ações tomadas:**
- Firmware completo documentado em `.claude/test/hardware-porta/`
- Implementa: Wi-Fi, MQTT (PubSubClient), SCT-013 (detecção de corrente para estado de porta), botão (simulando reed switch)
- Tópicos MQTT: `register`, `heartbeat`, `status`, `access-attempt`, `access-result`, `command`, `command-result`
- Validado contra o broker Aedes do projeto
