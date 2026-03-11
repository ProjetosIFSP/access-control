# Histórico de Implementações

---

## PERM-005 + INFRA-IOT-001 — Verificação de Acesso Unificada + Broker IoT Corrigido

**Data:** Sessão de correção de bugs e fluxo IoT com sensorProtocol/sensorModel
**Escopo:** `server/src/services/iot/access.ts`, `server/src/services/permissions/`, `server/src/api/routes/iot.ts`, `server/src/services/iot/door-controller.ts`, `server/src/db/seed.ts`, `iot/src/index.ts`

### PERM-005 — Verificação de Acesso Unificada (confirmado resolvido)

**Status:** Confirmado por inspeção de código — `processAccessAttempt` já chamava `checkUserRoomAccess` com os 4 níveis de permissão. O bug estava anotado como pendente mas já havia sido corrigido em sessão anterior.

**Ação adicional realizada:** `checkUserRoomAccess` foi extraído de `services/iot/access.ts` para um módulo próprio em `services/permissions/check-user-room-access.ts`. A função pertence conceitualmente ao domínio de permissões, não ao domínio IoT. A dependência arquiteturalmente invertida (`permissions/verify-access` importando de `iot/access`) foi eliminada.

**Arquivos modificados:**
| Arquivo | Mudança |
|---|---|
| `server/src/services/permissions/check-user-room-access.ts` | **Criado** — contém `checkUserRoomAccess` com os 4 níveis de permissão (PERM-001 a PERM-004) e expiração |
| `server/src/services/iot/access.ts` | Removida a implementação duplicada de `checkUserRoomAccess`; passa a importar de `permissions/check-user-room-access` |
| `server/src/services/permissions/verify-access.ts` | Atualizado para importar `checkUserRoomAccess` de `permissions/check-user-room-access` (em vez de `iot/access`) |

---

### INFRA-IOT-001 — Broker IoT: métodos HTTP, paths e sensorProtocol/sensorModel

**Contexto:** O broker MQTT (`iot/src/index.ts`) usava `POST` fixo para todas as chamadas ao backend e paths incorretos. As rotas do backend usam métodos HTTP variados (`PUT`, `PATCH`, `GET`) e paths com convenções diferentes (plural em `access-attempts`, sem `/pull` nos comandos). Além disso, `sensorProtocol` e `sensorModel` não eram transmitidos no registro do controlador.

**Correções aplicadas:**

#### 1. `callApi` refatorado — suporte a múltiplos métodos HTTP

```
// Antes: POST fixo para todas as chamadas
async function callApi(path: string, body?: string)

// Depois: método como primeiro argumento
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
async function callApi(method: HttpMethod, path: string, body?: string)
```

Body não é enviado em requisições `GET`. Mensagem de erro melhorada para incluir método e path.

#### 2. Alinhamento de paths e métodos

| Handler | Antes | Depois |
|---|---|---|
| `handleRegister` | `POST /iot/devices/register` | `PUT /iot/devices/:id` |
| `handleHeartbeat` | `POST /iot/devices/:id/heartbeat` | `PATCH /iot/devices/:id/heartbeat` |
| `handleStatus` | `POST /iot/devices/:id/status` | `PUT /iot/devices/:id/status` |
| `handleAccessAttempt` | `POST .../access-attempt` (singular) | `POST .../access-attempts` (plural) |
| `pollCommands` | `POST .../commands/pull` | `GET .../commands?limit=5` |
| `handleCommandResult` | `POST .../commands/:id/ack` | `PATCH .../commands/:id/ack` |
| `enqueueUnlockCommand` | `POST` (implícito) | `POST` (explícito) |

#### 3. sensorProtocol e sensorModel no registro

- `registerPayloadSchema` no broker aceita `sensorProtocol` (enum `"R30X"` | `"BOLAND"`) e `sensorModel` (string opcional)
- Ambos são repassados ao backend no `PUT /iot/devices/:id`
- `apiRegisterResponseSchema` inclui `sensorProtocol` e `sensorModel` na resposta
- Log de registro exibe `sensorProtocol` e `sensorModel` após sucesso

#### 4. Backend — rota de registro atualizada

- `PUT /iot/devices/:id`: body aceita `sensorProtocol` e `sensorModel` (opcionais)
- `registerControllerResponseSchema`: inclui `sensorProtocol` e `sensorModel` na resposta
- Heartbeat response também inclui os dois campos
- `bodyExample` e `registerControllerResponseExample` atualizados

#### 5. Service door-controller.ts atualizado

- `RegisterDoorControllerInput`: adicionados `sensorProtocol?` e `sensorModel?`
- `RegisterDoorControllerResult.controller`: inclui `sensorProtocol` e `sensorModel`
- `registerDoorController`: insere e atualiza `sensorProtocol`/`sensorModel`; update usa spread condicional (só atualiza se o campo foi enviado, evitando sobrescrever com null)
- `registerDoorController` e `recordDoorHeartbeat`: `.returning()` agora é explícito, selecionando apenas os campos necessários incluindo os novos

#### 6. Seed com door_controllers

- `seed.ts` cria 3 controladores por bloco (12 no total) nas primeiras salas de cada bloco
- Campos: `sensorProtocol: "R30X"`, `sensorModel: "ZN-53X"`, `firmwareVersion: "1.0.0"`, `lastSeenAt` variado
- `db.insert(room)` passou a usar `.returning()` para obter os IDs das salas criadas

**Arquivos modificados:**
| Arquivo | Mudança |
|---|---|
| `iot/src/index.ts` | `callApi` refatorado; todos os handlers com método e path corretos; `sensorProtocol`/`sensorModel` no registro |
| `server/src/api/routes/iot.ts` | `PUT /iot/devices/:id` aceita e retorna `sensorProtocol`/`sensorModel`; heartbeat response atualizado; schemas e exemplos atualizados |
| `server/src/services/iot/door-controller.ts` | `registerDoorController` e `recordDoorHeartbeat` persistem e retornam `sensorProtocol`/`sensorModel`; `returning()` explícito |
| `server/src/db/seed.ts` | Seed cria 12 `door_controller` com sensor ZN-53X/R30X nas primeiras salas de cada bloco |

---

## ARCH-003 — Modo Terminal Integrado às Fechaduras (revisa ARCH-002 parcialmente)

**Data:** Sessão de revisão arquitetural — modo dual de operação do ESP32
**Escopo:** `.claude/features/HARDWARE/hw-007-enrollment-terminal.md`, `.claude/architecture.md`, `.claude/features/index.md`, `.claude/features/todo.md`

### Contexto

A decisão anterior (ARCH-002) criou o conceito de `role = "enrollment_terminal"` em `door_controller` para representar um dispositivo ESP32 + ZN-53X dedicado exclusivamente ao cadastro de digitais, sem associação a nenhuma sala. Essa abordagem foi revisada: terminais dedicados exigem hardware extra, cabeamento adicional e um ponto físico permanente sem outra utilidade. Como cada sala já possui sua própria fechadura com ESP32 + ZN-53X, o hardware existente pode assumir o papel de terminal temporariamente.

### Decisão

**Toda fechadura é um terminal em potencial.** O ESP32 alterna entre dois modos de operação via MQTT:

- **Modo Fechadura** (padrão): processa acessos normais, controla relé
- **Modo Terminal** (temporário, TTL ~2 min): captura template biométrico para enrollment, ignora tentativas de acesso, retorna ao modo fechadura após concluir ou expirar

O modo é um **estado de runtime do firmware**, não uma propriedade permanente do banco de dados.

---

### Ações e reversões em relação ao ARCH-002

| Item | Ação |
|---|---|
| Campo `role` em `door_controller` | **Removido** do schema — todos os controladores são `"door"` implicitamente |
| `roomId` nullable em `door_controller` | **Revertido para NOT NULL** — todo controlador está associado a uma sala |
| `controllerRoleEnum` em `enums.ts` | **Removido** — enum sem uso |
| Aba "Terminais" em `/rooms` (UI-019) | **Removida** — substituída por seletor de fechaduras inline no `FingerprintHandDrawer` |
| Componente `_tab-terminals.tsx` | **Removido** ou deixado inativo — não há terminais dedicados para listar |
| `sensorProtocol` e `sensorModel` em `door_controller` | **Mantidos** — essenciais para compatibilidade de templates entre sensores |
| `enrolledByControllerId` em `access_credential` | **Mantido** — agora referencia a fechadura que realizou o enrollment em modo terminal |
| Prefixo MQTT `enrollment/{terminalId}/...` | **Substituído** por `door/{id}/enter-enrollment-mode`, `door/{id}/enrollment-result`, `door/{id}/cancel-enrollment` — unifica tudo sob `door/{id}/` |

---

### Novos tópicos MQTT introduzidos

| Tópico | Direção | Descrição |
|---|---|---|
| `door/{id}/enter-enrollment-mode` | Broker → Device | Coloca a fechadura em modo terminal; payload: `{ enrollmentId, userId, finger, expiresAt }` |
| `door/{id}/cancel-enrollment` | Broker → Device | Cancela enrollment em andamento |
| `door/{id}/enrollment-result` | Device → Broker | Template capturado (hex 512 chars) + status (`SUCCESS`/`FAILED`/`EXPIRED`) |
| `door/{id}/sync-credentials` | Broker → Device | Lista de templates para carregar nos slots do ZN-53X |
| `door/{id}/sync-result` | Device → Broker | Confirma slots carregados (e evictados) |
| `door/{id}/delete-credential` | Broker → Device | Remove template de slot específico |

---

### Impacto no schema de banco

```sql
-- Reverter mudanças do ARCH-002 que não se aplicam mais:
ALTER TABLE door_controller DROP COLUMN IF EXISTS role;
ALTER TABLE door_controller ALTER COLUMN room_id SET NOT NULL;

-- Manter do ARCH-002:
--   sensor_protocol TEXT CHECK (sensor_protocol IN ('R30X', 'BOLAND'))
--   sensor_model    TEXT
--   (em access_credential) enrolled_by_controller_id FK → door_controller

-- Novas tabelas a criar (migration pendente):
-- enrollment_request ( id, user_id, controller_id, finger, status, expires_at, created_at )
-- controller_credential_slot ( id, controller_id, credential_id, slot_id, synced_at, last_used_at )
```

---

### Impacto na UI

**UI-019** é redefinida: em vez de aba "Terminais" em `/rooms`, a funcionalidade de enrollment é acessada diretamente no `FingerprintHandDrawer`:
- Botão "Cadastrar via Fechadura" ao clicar em um dedo não cadastrado
- Dropdown com fechaduras online (query `GET /doors?online=true`)
- Spinner com countdown do TTL após confirmar
- Confirmação automática via polling `GET /iot/enrollment/:id/status`

---

### Arquivos de documentação atualizados

| Arquivo | Mudança |
|---|---|
| `.claude/features/HARDWARE/hw-007-enrollment-terminal.md` | Reescrito completamente — modo dual, novos tópicos, schema revisado, CA atualizados |
| `.claude/architecture.md` | Tópicos MQTT expandidos; fluxo de firmware com modo terminal; modelo de dados com novas tabelas; seção de enrollment biométrico adicionada |
| `.claude/features/index.md` | DOOR-001, UI-005, UI-019, HW-007 atualizados; prioridades reordenadas com reversão de schema como item 2 |
| `.claude/features/todo.md` | A atualizar nesta sessão |

---

## ARCH-002 — Decisões Arquiteturais de Hardware-Agnostic Biometria + UI de Terminais

**Data:** Sessão de decisões arquiteturais e implementação de schema/frontend
**Escopo:** `server/src/db/schema/`, `app/src/routes/rooms/`, `.claude/features/HARDWARE/`

### Contexto

Durante a discussão sobre possibilidade de uso do WA-28 USB no ESP32 e do CH340G como bridge, ficou definido que a arquitetura correta é: **mesmo protocolo de sensor (R30x) em terminal de enrollment e em fechaduras**, com sync de templates apenas entre dispositivos compatíveis. Isso levou a três decisões arquiteturais registradas aqui.

---

### 1. `door_controller` — suporte a terminais de enrollment (Opção A)

> ⚠️ **Parcialmente revertido por ARCH-003.** O campo `role` e o `roomId` nullable foram descartados. `sensorProtocol` e `sensorModel` permanecem.

**Decisão original:** em vez de criar tabela separada para terminais, adicionar campo `role` à tabela `door_controller` existente e tornar `roomId` nullable.

**Ações:**
- `server/src/db/schema/enums.ts` — adicionado `controllerRoleEnum` (`"door"` | `"enrollment_terminal"`) e `sensorProtocolEnum` (`"R30X"` | `"BOLAND"`) via `pgEnum`
- `server/src/db/schema/room.ts` — campo `role` adicionado com default `"door"`; `roomId` tornado nullable; campos `sensorProtocol` e `sensorModel` adicionados
- **Motivação original:** terminais reutilizam toda a infraestrutura de registro MQTT (heartbeat, `lastSeenAt`, `firmwareVersion`) sem duplicar código. Tabela separada seria overhead desnecessário para o TCC.

**Revisão (ARCH-003):** `role` removido e `roomId` restaurado como NOT NULL — o modo terminal é estado de runtime do firmware, não propriedade do banco. `sensorProtocol` e `sensorModel` permanecem sem alteração.

---

### 2. `access_credential` — rastreio de dispositivo de captura (`enrolledByControllerId`)

**Decisão:** registrar qual dispositivo físico (terminal de enrollment) capturou cada credencial biométrica.

**Ações:**
- `server/src/db/schema/access.ts` — adicionado campo `enrolledByControllerId` (FK para `door_controller`, `ON DELETE SET NULL`)

**Motivação:**
- **Auditoria:** saber qual terminal físico capturou cada digital permite rastrear problemas de qualidade de captura
- **Compatibilidade de sync:** o backend deriva o `sensorProtocol` do terminal via este campo para decidir para quais fechaduras sincronizar o template
- **Troca de hardware:** se o hardware do sensor mudar, o sistema nunca enviará templates antigos (de protocolo diferente) para novos controladores incompatíveis — o protocolo fica gravado implicitamente na credencial via esta FK

---

### 3. Regra de sync por `sensorProtocol`

**Decisão:** o backend sincroniza templates SOMENTE para controladores com `sensorProtocol` igual ao controlador que gerou o template (a condição `role = "door"` foi removida com ARCH-003 — todos os controladores são fechaduras).

**Documentado em:** `.claude/features/HARDWARE/hw-007-enrollment-terminal.md` — seção "Decisões Arquiteturais de Hardware-Agnostic"

**Consequências:**
- Troca de modelo de sensor (ex: ZN-53X → outro R30x-compatível): apenas `sensorModel` muda, `sensorProtocol = "R30X"` permanece — zero mudança de código
- Migração para novo protocolo: novos terminais registram novo `sensorProtocol`; período de transição pode rodar dois protocolos em paralelo sem conflito

---

### 4. Feature HW-008 — Offline-First nas Fechaduras

**Decisão:** formalizar a política de operação quando o MQTT está indisponível.

**Ações:**
- Criado `.claude/features/HARDWARE/hw-008-offline-first.md` com política completa:
  - Matching local sempre primeiro (ZN-53X via `fingerFastSearch()`)
  - Timeout de 3s aguardando `access-result` do broker
  - Se timeout/sem MQTT: concessão local + log em LittleFS/Preferences
  - Política de eviction quando 162 slots estão ocupados: evicta por `last_used_at` mais antigo (ou NULL)
  - Ao reconectar: publica `door/{id}/offline-log` com tentativas acumuladas
  - Novos tópicos MQTT: `offline-log`, `credential-used`
  - Novos endpoints REST: `POST /iot/offline-log`, `PATCH /iot/devices/:id/credential-used`
  - Novo campo `last_used_at` em `controller_credential_slot`

---

### 5. Aba "Terminais" no portal web (UI-019)

> ⚠️ **Revertido por ARCH-003.** A aba "Terminais" foi removida. A funcionalidade de seleção de fechadura para enrollment foi movida para dentro do `FingerprintHandDrawer` (UI-019 redefinida). Ver ARCH-003 para detalhes.

**Ações originais (revertidas ou inativas):**
- `app/src/routes/rooms/types.ts` — `TABS` atualizado para incluir `"terminals"` ← **remover `"terminals"`**
- `app/src/routes/rooms/_tabs.tsx` — novo `TabButton` "Terminais" com `terminalsCount` ← **remover**
- `app/src/routes/rooms/_tab-terminals.tsx` — criado do zero ← **remover ou deixar inativo**
- `app/src/routes/rooms/index.tsx` — query lazy por `role=enrollment_terminal` ← **remover query e renderização**

**Nova definição de UI-019 (ARCH-003):** seletor de fechaduras inline no `FingerprintHandDrawer`, com dropdown de fechaduras online, spinner com countdown e polling de status do enrollment.

---

### Arquivos modificados

| Arquivo | Tipo de mudança |
|---|---|
| `server/src/db/schema/enums.ts` | Adicionados `controllerRoleEnum` (⚠️ reverter — ARCH-003) e `sensorProtocolEnum` (manter) |
| `server/src/db/schema/room.ts` | `doorController`: `role` (⚠️ reverter), `sensorProtocol`, `sensorModel` (manter); `roomId` nullable (⚠️ reverter para NOT NULL) |
| `server/src/db/schema/access.ts` | `accessCredential`: `enrolledByControllerId` (manter) |
| `app/src/routes/rooms/types.ts` | `TABS` com `"terminals"` (⚠️ reverter — ARCH-003) |
| `app/src/routes/rooms/_tabs.tsx` | Prop `terminalsCount` + novo `TabButton` (⚠️ reverter — ARCH-003) |
| `app/src/routes/rooms/_tab-terminals.tsx` | Criado (⚠️ remover ou inativar — ARCH-003) |
| `app/src/routes/rooms/index.tsx` | Import + query lazy + renderização da aba (⚠️ reverter — ARCH-003) |
| `.claude/features/HARDWARE/hw-007-enrollment-terminal.md` | Seções de decisões arquiteturais, novos campos de banco, CA-07b |
| `.claude/features/HARDWARE/hw-008-offline-first.md` | Criado (nova feature) |
| `.claude/features/index.md` | UI-019 e HW-008 adicionados; CRED-001, DOOR-001, UI-005, HW-007 atualizados |
| `.claude/features/todo.md` | Task 0 (migração de banco) adicionada como prioritária; pendências de backend/IoT/frontend expandidas |

---

## REFACTOR-001 — Refatoração de Performance e Conformidade com Diretrizes

**Data:** Sessão de análise e refatoração geral
**Escopo:** `server/`, `app/` — módulo de biometria e infraestrutura de rotas

**Problemas identificados e resolvidos:**

### 1. Helper `requireAdmin` compartilhado (DRY — backend)

**Problema:** `requireAdmin` e `resolveSession` eram definidos localmente em cada arquivo de rota (`user.ts`, `profile.ts`, `room.ts`, `block.ts`) — 4 cópias idênticas (ou quase) duplicando ~30 linhas cada.

**Ação:**
- Criado `server/src/lib/require-admin.ts` com `resolveSession`, `requireAdmin` e `GuardReply` exportados
- Removidas as funções locais de todos os 4 arquivos de rota
- Substituídos todos os `type AdminReply` locais pelo `GuardReply` importado do helper
- `block.ts`: 4 blocos `auth.api.getSession()` manuais substituídos por `requireAdmin(request, reply as never)`

**Impacto:** ~120 linhas removidas; comportamento idêntico; point único de mudança se a lógica de autenticação mudar.

---

### 2. `registerFingerprint` — remoção do SELECT redundante (N+1 → 1 query)

**Problema:** `register-fingerprint.ts` executava um `SELECT` para verificar se o dedo já estava cadastrado **antes** do `INSERT`. O banco já tem constraint `UNIQUE` composta em `(userId, finger)` e constraint `UNIQUE` no campo `value` — o SELECT era desnecessário e criava N+1 queries.

**Ação:**
- Removido o `SELECT` de verificação prévia
- `INSERT` direto capturando o erro Postgres `23505` (unique violation)
- Adicionada `FingerprintDuplicateTemplateError` para distinguir conflito de template global vs. conflito de dedo por usuário
- Rota `POST /users/:id/fingerprints` atualizada para capturar ambos os erros e retornar 409

**Impacto:** Redução de 1 round-trip ao banco por cadastro; semântica de erro mais precisa.

---

### 3. `listFingerprints` — ordenação com `asc()` explícito

**Problema:** `.orderBy(accessCredential.createdAt)` sem `asc()` explícito — comportamento dependente da implementação do Drizzle (implicitamente ascendente, mas não documentado).

**Ação:** Substituído por `.orderBy(asc(accessCredential.createdAt))`.

---

### 4. `FingerprintHandDrawer` — `useQuery` usando `queryOptions` centralizado

**Problema:** O drawer definia `queryKey` e `queryFn` inline, duplicando a lógica que já existe em `services/users/fingerprints.ts` via `userFingerprintsQueryOptions`.

**Ação:** Substituído `useQuery({ queryKey: ..., queryFn: ..., staleTime: ... })` por `useQuery({ ...userFingerprintsQueryOptions(open ? userId : null) })`.

---

### 5. `FingerprintHandDrawer` — consolidação de `useEffect` do status do reader

**Problema:** Dois `useEffect` separados observavam `reader.status` — um para `"error"` (reset + limpa dedo) e outro para `"success"` (auto-registro). Causava duplicação de dependências e potencial de race condition sutil.

**Ação:** Consolidados em um único `useEffect` com early-return para o caso de erro.

---

### 6. `FingerprintHandDrawer` — remoção do toast de sucesso (violação de guideline UX)

**Problema:** `toast.success("Digital cadastrada com sucesso!")` era disparado no `onSuccess` da mutation. Segundo o guideline UX: *"se o usuário consegue ver o resultado diretamente na interface, não use toast"*. O SVG da mão já exibe o dedo selecionado em verde imediatamente após o registro.

**Ação:** Removido o toast de sucesso. Toast de erro no `onError` mantido (válido — falha em background sem feedback visual alternativo).

---

### 7. `verify-access.ts` — correção de gap de segurança (credencial inativa)

**Problema:** `verifyAccess` buscava a credencial sem filtrar por `isActive`, permitindo que uma credencial desativada fosse aceita no endpoint `/verify`. Além disso, usava `select()` sem projeção (select *).

**Ação:**
- Adicionado filtro `eq(accessCredential.isActive, true)` na busca da credencial
- Substituído `select()` por `select({ userId, isActive })` com projeção explícita
- Adicionado `.limit(1)` nas queries de sala e credencial
- Sala também com projeção explícita: `{ id, typeId, requiresBiometry, requiresRFID }`

---

### 8. `useIsMobile.hook.ts` → `use-is-mobile.ts` (kebab-case + named export)

**Problema:** Nome de arquivo com sufixo `.hook.ts` viola a convenção `kebab-case` puro do guideline. Export era `default export` (guideline prefere named exports para componentes e hooks).

**Ação:**
- Arquivo renomeado: `useIsMobile.hook.ts` → `use-is-mobile.ts`
- Convertido de `export default` para `export function useIsMobile()`
- Tipo `NodeJS.Timeout` substituído por `ReturnType<typeof setTimeout>` (independente de runtime)
- Import em `user-menu.tsx` atualizado para named import

---

**Arquivos modificados:**
- `server/src/lib/require-admin.ts` *(novo)*
- `server/src/services/user/fingerprint/register-fingerprint.ts`
- `server/src/services/user/fingerprint/list-fingerprints.ts`
- `server/src/services/permissions/verify-access.ts`
- `server/src/api/routes/user.ts`
- `server/src/api/routes/profile.ts`
- `server/src/api/routes/room.ts`
- `server/src/api/routes/block.ts`
- `app/src/components/users/fingerprint-hand-drawer.tsx`
- `app/src/hooks/use-is-mobile.ts` *(renomeado de useIsMobile.hook.ts)*
- `app/src/components/header/user-menu.tsx`

**Testes:** 110/110 passing (Vitest — `app/src/services/users/fingerprints.test.ts` e suite completa)


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

## HW-007 — Terminal de Enrollment Biométrico (ZN-53X + ESP32) — Arquitetura definida

**Status:** ⬜ Não iniciado no firmware — arquitetura documentada

**Ações tomadas:**

### Decisão arquitetural
- Identificado que o `Chipsailing CS9711` embutido no notebook usa classe USB Vendor Specific (0xFF) com transferência Bulk — incompatível com Web HID API
- Identificado que o WA26 (Boland) e o ZN-53X usam algoritmos biométricos de fabricantes diferentes — templates são incompatíveis entre si
- Comparação exata de template (`WHERE value = ?`) nunca funcionaria entre sensores heterogêneos
- **Decisão:** terminal físico dedicado ESP32 + ZN-53X para enrollment, substituindo o WA26 no fluxo de produção
- Templates extraídos via protocolo R30x (UploadTemplate 0x08) e distribuídos via MQTT para todos os controladores
- Matching on-device em cada ZN-53X via `fingerFastSearch()` — sem matching centralizado no backend

### Documentação criada
- `.claude/features/HARDWARE/hw-007-enrollment-terminal.md` — feature completa com fluxo, novos tópicos MQTT, novos endpoints REST, schema das tabelas `enrollment_request` e `controller_credential_slot`, critérios de aceite e notas de implementação
- `.claude/test/enrollment-terminal/README.md` — guia de testes incremental com 6 passos validáveis (compatibilidade R30x → captura → extração → MQTT → download → matching)
- `.claude/test/enrollment-terminal/firmware-enrollment-test.ino` — firmware Arduino para ESP32S com todos os 6 passos implementados via Serial Monitor e fluxo MQTT automático

### Impacto em features existentes
- `CRED-001` — fluxo real de cadastro de digitais passa pelo terminal ZN-53X; WA26 e `useFingerprintReader` permanecem apenas para demonstração do hook
- `HW-002` — agora depende de HW-007 para definição do formato de template e protocolo de sync MQTT
- `index.md` e `todo.md` atualizados com HW-007 e novos itens de backend/MQTT desbloqueados

---

## REFACTOR-002 — Migração de Query Params para nuqs

**Data:** sessão atual
**Arquivos modificados:**
- `app/src/routes/index.tsx`
- `app/src/routes/users.tsx`
- `app/src/routes/rooms.tsx`

### Motivação

As três rotas de página gerenciavam query params via `validateSearch` + `Route.useSearch()` + `Route.useNavigate()` manualmente, com padrões repetitivos e frágeis:
- `validateSearch` com parsing manual de tipos (`typeof search.q === "string"`, etc.)
- `useDebounce` + `useRef(false)` + `useEffect` para evitar o flush no mount e sincronizar inputValue → URL
- `useEffect` separado para reset de filtros ao trocar de aba
- `navigate({ search: prev => ({ ...prev, ... }) })` espalhado por toda a função de componente

### O que foi feito

1. **`index.tsx`** — Substituído `validateSearch` + `loaderDeps` + `navigate` + `useDebounce` + `isMounted` ref por:
   - Parser declarativo `indexSearchParams` com `parseAsString.withDefault("")`
   - `useQueryStates(indexSearchParams, { history: "replace", shallow: false, limitUrlUpdates: debounce(400), clearOnDefault: true })`
   - `setParams({ q: value || null })` substitui toda a lógica de sync com URL
   - `setType` e `setState` viram `useCallback` simples de uma linha

2. **`users.tsx`** — Substituído parser manual + 2 `useEffect` de sync + `useRef` de guard por:
   - Parser declarativo `usersSearchParams` com `parseAsString`, `parseAsStringLiteral(TABS)`, `parseAsArrayOf(parseAsString)`, `parseAsInteger`
   - `useQueryStates` com `limitUrlUpdates: debounce(400)` — o debounce acontece nativamente na camada nuqs, sem estado intermediário
   - `setActiveTab` virou `useCallback` que chama `setParams({ tab: null, q: null, profileIds: null, page: null })` — reset atômico e sem guards
   - `selectedProfileId` derivado de `paramProfileIds[0] ?? "all"` (sem `useState` separado)
   - `goToPage` virou `setParams({ page: p === 1 ? null : p })`
   - Removidos: `useRef(false)` (syncMounted, tabMounted), `useDebounce`, import `useDebounce`

3. **`rooms.tsx`** — Mesma abordagem que `users.tsx`:
   - Parser `roomsSearchParams` com 5 campos tipados
   - `selectedTypeId` e `selectedBlockId` derivados dos arrays de params (sem `useState` separado)
   - `setSelectedTypeId` / `setSelectedBlockId` como `useCallback` com `setParams`
   - `setActiveTab` com reset atômico de todos os filtros
   - Removidos: `validateSearch`, `loaderDeps`, `useDebounce`, 2 `useRef`, 2 `useEffect` de sync, `navigate`
   - Removido import desnecessário de `usersQueryOptions` (não era usado no loader de rooms)

### Ganhos de performance

- **Sem duplo render no mount:** o padrão `isMounted.current = true; return` no `useEffect` existia para evitar um flush inicial desnecessário. Com nuqs, o estado já nasce correto da URL — sem necessidade de guard.
- **Debounce nativo sem estado extra:** `limitUrlUpdates: debounce(400)` aplica o debounce apenas às escritas na URL, mantendo o `inputValue` local respondendo imediatamente — sem o par `(inputValue, debouncedValue)` que causava re-renders duplos.
- **Batching atômico:** `setParams({ a, b, c })` envia todas as mudanças em um único push de history, sem múltiplos `navigate()` encadeados.
- **`clearOnDefault: true`:** remove automaticamente params com valor default da URL (ex: `page=1` nunca aparece na barra de endereço), mantendo URLs limpas.
- **Suporte a browser back/forward:** `useEffect(() => setInputValue(q), [q])` garante que o input local reflita a URL quando o usuário usa o botão Voltar — sem lógica manual.

### O que NÃO foi alterado

- `use-debounce.ts` — mantido, pois ainda é usado em `use-crud-page.ts` para estado local (sem URL)
- `use-crud-page.ts` — mantido sem alterações; o hook é para estado puramente local de UI, não gerencia URL
- Lógica de queries TanStack Query, mutations, panel state (`PanelMode`) — sem alterações

## HW-001 (teste) — Firmware de Teste ESP32S [L453-460]

**Ações tomadas:**
- Firmware completo documentado em `.claude/test/hardware-porta/`
- Implementa: Wi-Fi, MQTT (PubSubClient), SCT-013 (detecção de corrente para estado de porta), botão (simulando reed switch)
- Tópicos MQTT: `register`, `heartbeat`, `status`, `access-attempt`, `access-result`, `command`, `command-result`
- Validado contra o broker Aedes do projeto
