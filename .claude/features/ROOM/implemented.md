# ROOM — Implementações Realizadas

## ROOM-001 — CRUD de Blocos

**Status:** ✅ Concluído

---

### Serviços e Rotas

**Arquivo:** `server/src/api/routes/block.ts`

Endpoints REST protegidos por `requireAdmin`, documentados no Swagger:

| Método | Path | Resposta | Descrição |
|--------|------|----------|-----------|
| `GET` | `/blocks` | 200 | Lista todos os blocos |
| `POST` | `/blocks` | 201 | Cria novo bloco |
| `PUT` | `/blocks/:id` | 200 / 404 | Atualiza nome do bloco |
| `DELETE` | `/blocks/:id` | 204 / 404 | Remove bloco (falha se tiver salas vinculadas) |

**Modelo de dados:**
```ts
{
  id: string (UUID v7)
  name: string  // ex: "Bloco A", "Laboratório de Informática"
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

### Integração no Frontend

**`app/src/routes/rooms.tsx`** — aba "Blocos" no layout split-view:
- Lista de blocos com busca local
- Formulário inline de criação/edição
- Dialog de confirmação antes de excluir
- Componentes em `app/src/components/blocks/`

---

## ROOM-002 — CRUD de Salas

**Status:** ✅ Concluído

---

### Serviços e Rotas

**Arquivo:** `server/src/api/routes/room.ts`

Endpoints REST protegidos por `requireAdmin`, documentados no Swagger:

| Método | Path | Resposta | Descrição |
|--------|------|----------|-----------|
| `GET` | `/rooms` | 200 | Lista todas as salas (público — sem auth) |
| `POST` | `/rooms` | 201 | Cria nova sala |
| `PUT` | `/rooms/:id` | 200 / 404 | Atualiza dados da sala |
| `DELETE` | `/rooms/:id` | 204 / 404 | Remove sala |

**Modelo de dados:**
```ts
{
  id: string (UUID v7)
  name: string           // ex: "Lab. de Redes", "Sala 01"
  blockId: string        // FK → block
  roomTypeId: string     // FK → room_type
  capacity: number | null
  description: string | null
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Nota:** `GET /rooms` é a única rota pública do sistema — retorna dados de salas (nome, bloco, tipo, estado da porta) sem exigir autenticação. Usuários não autenticados não recebem `currentUser` e `lastUser`.

---

### Integração no Frontend

**`app/src/routes/index.tsx`** — página pública:
- Consome `GET /rooms` para exibir cards de salas agrupados por bloco
- Filtros: busca por nome, tipo de sala, estado da porta

**`app/src/routes/rooms.tsx`** — aba "Salas" (admin):
- Split-view: lista de salas à esquerda, painel de edição à direita
- Formulário com seleção de bloco e tipo de sala (dropdown)
- Componentes em `app/src/components/rooms/` e `app/src/components/rooms-admin/`

---

## ROOM-003 — Relações da Sala

**Status:** ✅ Concluído

---

### Endpoint

`GET /rooms/:id/relations`

**Retorna:**
- `profiles` — perfis com permissão de acesso àquela sala (via `profile_room_permission`)
- `users` — usuários com permissão direta (via `user_room_permission`)
- `controller` — controlador físico vinculado à sala (se houver)

**Uso principal:** pré-carregamento ao abrir o painel de edição de uma sala na UI, e para exibir quem tem acesso a cada sala.

---

## ROOM-004 — Listagem de Tipos de Sala

**Status:** ✅ Concluído

---

### Endpoint

`GET /room-types` — **público** (sem autenticação necessária)

**Arquivo:** `server/src/api/routes/room-types.ts`

**Retorna:**
```json
[
  { "id": "uuid", "name": "Laboratório" },
  { "id": "uuid", "name": "Sala de Aula" },
  { "id": "uuid", "name": "Auditório" }
]
```

**Uso:** Alimenta os dropdowns e `MultiSelect` de tipo de sala nos formulários de criação/edição de sala, usuário e perfil.

---

## ROOM-005 — CRUD Completo de Tipos de Sala

**Status:** ⬜ Não iniciado

---

### O que precisa ser implementado

**Backend:**

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/room-types` | Criar novo tipo de sala |
| `PUT` | `/room-types/:id` | Atualizar nome do tipo |
| `DELETE` | `/room-types/:id` | Remover tipo (validar se há salas vinculadas) |

**Arquivo a modificar:** `server/src/api/routes/room-types.ts`

**Validações necessárias:**
- Nome único (constraint no banco)
- Não permitir exclusão se houver salas ou permissões vinculadas ao tipo

**Frontend (UI-011):**
- Adicionar aba ou seção "Tipos de Sala" na página `/rooms` (admin)
- Formulário simples: campo de nome + botão de criar/editar/excluir
- Bloqueia exclusão com mensagem explicativa se o tipo estiver em uso

---

### Modelo de dados existente

```ts
// server/src/db/schema/room.ts
{
  id: string (UUID v7)
  name: string  // ex: "Laboratório", "Sala de Aula"
  createdAt: timestamp
}
```

A tabela já existe e é populada via seed. O que falta são os endpoints de escrita.

---

## Estado dos Controladores por Sala

Cada sala pode ter 0 ou 1 `door_controller` vinculado. O controlador é registrado via MQTT (tópico `door/{id}/register`) e armazenado na tabela `door_controller` com referência ao `roomId`.

O estado da porta (`doorState`, `isLocked`, `lastSeenAt`) é atualizado em tempo real pelo firmware via broker MQTT.

**Campos relevantes do `door_controller`:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID do controlador (mesmo usado no MQTT) |
| `roomId` | UUID | Sala vinculada |
| `doorState` | enum (OPEN / CLOSED / UNKNOWN) | Estado atual da porta |
| `isLocked` | boolean | Fechadura travada? |
| `lastSeenAt` | timestamp | Último heartbeat recebido |
| `firmwareVersion` | string | Versão do firmware reportada |

---

## Gaps / Pendências

| ID | Descrição | Bloqueador |
|----|-----------|-----------|
| ROOM-005 | CRUD completo de tipos de sala (criar, atualizar, excluir) | — (pode ser feito) |
| UI-011 | Interface admin para gerenciar tipos de sala | ROOM-005 |
| UI-016 | Monitoramento em tempo real do estado das salas no frontend | Polling ou WebSocket |