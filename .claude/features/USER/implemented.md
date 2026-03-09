# USER — Implementações Realizadas

## USER-001 — CRUD de Usuários

**Status:** ✅ Concluído

---

### Serviços

**`server/src/services/user/create-user.ts`**
- `createUser(payload)` — cria usuário via better-auth (garante hash de senha correto)
- Campos: `name`, `email`, `password`, `isAdmin`
- Valida unicidade de email (constraint do banco)

**`server/src/services/user/get-user.ts`**
- `getUsers(filters?)` — lista todos os usuários com `fingerprintCount` via subquery SQL
- Retorna `UserSummary[]` com campos: `id`, `name`, `email`, `isAdmin`, `createdAt`, `fingerprintCount`

**`server/src/services/user/update-user.ts`**
- `updateUser(id, payload)` — atualiza `name`, `email`, `isAdmin`
- Não permite alterar senha via este endpoint (fluxo separado via better-auth)

**`server/src/services/user/delete-user.ts`**
- `deleteUser(id)` — remove usuário e cascata para relações (perfis, permissões, credenciais)

---

### Endpoints REST

Todos em `server/src/api/routes/user.ts`, protegidos por `requireAdmin`, documentados no Swagger:

| Método | Path | Resposta | Descrição |
|--------|------|----------|-----------|
| `GET` | `/users` | 200 | Lista todos os usuários com `fingerprintCount` |
| `POST` | `/users` | 201 | Cria novo usuário |
| `PUT` | `/users/:id` | 200 / 404 | Atualiza dados do usuário |
| `DELETE` | `/users/:id` | 204 / 404 | Remove usuário |

**Schema de resposta `userSummarySchema`:**
```ts
z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  isAdmin: z.boolean(),
  createdAt: z.string().datetime(),
  fingerprintCount: z.number(),
})
```

---

### `fingerprintCount` via subquery SQL

Adicionado em `get-user.ts`, o `SELECT` inclui uma subquery que conta credenciais do tipo `FINGERPRINT` por usuário:

```sql
(SELECT COUNT(*)
 FROM access_credential
 WHERE user_id = user.id
   AND type = 'FINGERPRINT'
) AS fingerprint_count
```

Isso evita N+1 queries — a contagem é calculada em uma única query ao banco.

---

## USER-002 — Relações do Usuário

**Status:** ✅ Concluído

---

### Endpoint

`GET /users/:id/relations`

**Retorna:**
- `profiles` — perfis de acesso vinculados ao usuário (via `user_profile`)
- `roomPermissions` — salas com permissão direta (via `user_room_permission`)
- `roomTypePermissions` — tipos de sala com permissão (via `user_room_type_permission`)

**Uso principal:** pré-carregamento ao abrir o painel de edição de um usuário na UI (`/users`).

---

### Integração no frontend

**`app/src/routes/users.tsx`**
- Ao selecionar um usuário na tabela, a rota dispara um prefetch de `GET /users/:id/relations`
- Os dados são usados para preencher os `MultiSelect` de perfis, tipos de sala e salas diretas no formulário de edição

**`app/src/services/users/`**
- Funções de API client: `fetchUsers`, `fetchUserRelations`, `createUser`, `updateUser`, `deleteUser`
- Query options e query keys para cada endpoint
- Invalidação de cache `["users"]` após mutations de escrita

---

## Gestão de Credenciais de Fingerprint por Usuário

Ver detalhes completos em `.claude/features/CREDENCIAL/implemented.md`.

**Resumo dos endpoints de fingerprint em `user.ts`:**

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/users/:id/fingerprints` | Lista digitais do usuário |
| `POST` | `/users/:id/fingerprints` | Cadastra nova digital |
| `DELETE` | `/users/:id/fingerprints/:credentialId` | Remove digital |
| `PATCH` | `/users/:id/fingerprints/:credentialId` | Ativa/desativa digital |

---

## Gaps / Pendências

| ID | Descrição | Prioridade |
|----|-----------|-----------|
| CRED-002 | Endpoints de NFC_TAG por usuário (`GET/POST/DELETE/PATCH /users/:id/nfc-tags`) | Média |
| UI-015 | Badges de perfis do usuário na coluna da tabela de listagem | Baixa |
| UI-017 | Paginação na tabela de usuários (hoje carrega todos de uma vez) | Baixa |