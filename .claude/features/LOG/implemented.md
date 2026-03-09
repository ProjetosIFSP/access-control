# LOG — Implementações Realizadas

## LOG-001 — Registro de Log de Acessos (GRANTED / DENIED)

**Status:** ✅ Concluído

---

### Modelo de Dados

**Tabela `access_log`** em `server/src/db/schema/access.ts`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID v7 | Identificador único do log |
| `userId` | UUID (FK → user) | Usuário que tentou o acesso (nullable se credencial não encontrada) |
| `controllerId` | string (FK → door_controller) | Controlador onde ocorreu a tentativa |
| `roomId` | UUID (FK → room) | Sala vinculada ao controlador |
| `credentialType` | enum (FINGERPRINT / NFC_TAG) | Tipo de credencial apresentada |
| `status` | enum (GRANTED / DENIED) | Resultado da tentativa |
| `reason` | string | Motivo textual da decisão |
| `createdAt` | timestamp (with timezone) | Momento da tentativa |

---

### Onde é populado

A tabela é preenchida automaticamente em `server/src/services/iot/access.ts`, função `processAccessAttempt`, ao final de cada tentativa de acesso recebida pelo broker MQTT via tópico `door/{id}/access-attempt`.

**Fluxo:**
```
Broker recebe access-attempt
    │
    └─► processAccessAttempt(controllerId, credentialValue, credentialType)
            │
            ├─► Busca controlador → obtém roomId
            ├─► Busca usuário pela credencial
            ├─► Verifica permissão (atualmente só PERM-001)
            └─► INSERT INTO access_log { userId, controllerId, roomId, status, reason, credentialType }
```

**Razões registradas (campo `reason`):**

| Cenário | Status | Reason |
|---------|--------|--------|
| Controlador não encontrado | DENIED | `"Controlador não encontrado"` |
| Credencial não encontrada | DENIED | `"Credencial não encontrada"` |
| Credencial inativa | DENIED | `"Credencial inativa"` |
| Usuário sem permissão | DENIED | `"Sem permissão para esta sala"` |
| Acesso concedido | GRANTED | `"Permissão direta encontrada"` (ou motivo do nível de permissão) |

> ⚠️ **Gap (PERM-005):** O `reason` atual é gerado pela verificação simplificada de apenas PERM-001. Após integrar `verifyAccess`, o `reason` passará a refletir qual dos 4 níveis concedeu o acesso (ex: `"Acesso via perfil 'Docentes'"`, `"Acesso via tipo de sala 'Laboratório'"`).

---

### Verificação dos dados

Para consultar os logs diretamente no banco:

```sql
SELECT
  al.id,
  u.name AS user_name,
  r.name AS room_name,
  al.status,
  al.reason,
  al.credential_type,
  al.created_at
FROM access_log al
LEFT JOIN "user" u ON u.id = al.user_id
LEFT JOIN room r ON r.id = al.room_id
ORDER BY al.created_at DESC
LIMIT 20;
```

---

## LOG-002 — Endpoint de Consulta de Histórico de Acessos

**Status:** ⬜ Não iniciado — bloqueia UI-010

---

### O que precisa ser implementado

Rota `GET /access-logs` no backend com:

**Filtros suportados (query params):**
- `roomId` — filtrar por sala
- `userId` — filtrar por usuário
- `status` — `GRANTED` ou `DENIED`
- `from` — data/hora de início (ISO 8601)
- `to` — data/hora de fim (ISO 8601)
- `limit` — máximo de registros (padrão: 50, máx: 200)
- `offset` — paginação por offset

**Resposta esperada (por item):**
```json
{
  "id": "uuid",
  "userId": "uuid | null",
  "userName": "string | null",
  "roomId": "uuid",
  "roomName": "string",
  "controllerId": "string",
  "credentialType": "FINGERPRINT | NFC_TAG",
  "status": "GRANTED | DENIED",
  "reason": "string",
  "createdAt": "2024-01-15T14:30:00.000Z"
}
```

**Proteção:** `requireAdmin`

**Documentação:** Swagger/OpenAPI com schema Zod

---

### Arquivos a criar/modificar

- `server/src/api/routes/` — novo arquivo `access-log.ts` ou adicionar em rota existente
- `server/src/services/` — serviço `get-access-logs.ts` com query Drizzle e filtros
- `server/src/api/server.ts` — registrar a nova rota
- `app/src/services/` — função client para consumir o endpoint (após implementação)

---

### Query Drizzle de referência

```ts
// Esboço da query de listagem de logs
const logs = await db
  .select({
    id: accessLog.id,
    userId: accessLog.userId,
    userName: user.name,
    roomId: accessLog.roomId,
    roomName: room.name,
    controllerId: accessLog.controllerId,
    credentialType: accessLog.credentialType,
    status: accessLog.status,
    reason: accessLog.reason,
    createdAt: accessLog.createdAt,
  })
  .from(accessLog)
  .leftJoin(user, eq(accessLog.userId, user.id))
  .leftJoin(room, eq(accessLog.roomId, room.id))
  .where(
    and(
      roomId ? eq(accessLog.roomId, roomId) : undefined,
      userId ? eq(accessLog.userId, userId) : undefined,
      status ? eq(accessLog.status, status) : undefined,
      from ? gte(accessLog.createdAt, new Date(from)) : undefined,
      to ? lte(accessLog.createdAt, new Date(to)) : undefined,
    ),
  )
  .orderBy(desc(accessLog.createdAt))
  .limit(limit)
  .offset(offset);
```

---

### Dependência para o frontend

UI-010 (página de histórico de acessos) está bloqueada até que LOG-002 seja implementado. A página precisará de:
- Tabela com colunas: usuário, sala, status (badge colorido), tipo de credencial, data/hora
- Filtros por sala, usuário, status e período
- Paginação por offset ou cursor
- Possível exportação para CSV (para fins de auditoria no TCC)