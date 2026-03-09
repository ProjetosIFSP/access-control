# PERM — Implementações Realizadas

## PERM-001 a PERM-004 — Sistema de Permissões em 4 Níveis

**Status:** ✅ Concluído (estrutura e endpoints) | 🔧 Gap em PERM-005 (verificação no fluxo IoT)

---

### Modelo de Dados

Quatro tabelas de permissão no schema `server/src/db/schema/access.ts`:

| Tabela | Significado |
|--------|-------------|
| `user_room_permission` | Usuário tem acesso direto a uma sala específica |
| `user_room_type_permission` | Usuário tem acesso a todas as salas de um tipo |
| `profile_room_permission` | Perfil concede acesso a uma sala específica |
| `profile_room_type_permission` | Perfil concede acesso a todas as salas de um tipo |

Vínculo usuário ↔ perfil via tabela `user_profile` (muitos-para-muitos).

---

### Serviço de Verificação de Acesso

**`server/src/services/permissions/verify-access.ts`**

Função `verifyAccess(userId, roomId)` que verifica os 4 níveis em cascata:

```
1. PERM-001: user_room_permission (userId, roomId)
2. PERM-002: user_room_type_permission (userId, room.roomTypeId)
3. PERM-003: profile_room_permission via user_profile (userId → profileId, roomId)
4. PERM-004: profile_room_type_permission via user_profile (userId → profileId, room.roomTypeId)
```

Retorna `{ granted: boolean, reason: string }` — o primeiro nível que conceder acesso encerra a verificação.

---

### Endpoints REST

**`server/src/api/routes/permissions.ts`**

Endpoints de atribuição e remoção de permissões, todos protegidos por `requireAdmin`:

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/permissions/user-room` | Conceder acesso direto usuário → sala |
| `DELETE` | `/permissions/user-room` | Revogar acesso direto usuário → sala |
| `POST` | `/permissions/user-room-type` | Conceder acesso usuário → tipo de sala |
| `DELETE` | `/permissions/user-room-type` | Revogar acesso usuário → tipo de sala |
| `POST` | `/permissions/profile-room` | Conceder acesso perfil → sala |
| `DELETE` | `/permissions/profile-room` | Revogar acesso perfil → sala |
| `POST` | `/permissions/profile-room-type` | Conceder acesso perfil → tipo de sala |
| `DELETE` | `/permissions/profile-room-type` | Revogar acesso perfil → tipo de sala |

---

### Integração no Frontend

**Deduplicação visual no formulário de usuário (`user-form-panel.tsx` / `user-form-dialog.tsx`)**

Ao selecionar perfis e tipos de sala para um usuário, as salas já cobertas por essas seleções aparecem como `readonlyBadge` no `MultiSelect` de salas diretas — impedindo concessão redundante de permissões.

Lógica:
1. Calcular conjunto de salas cobertas pelos perfis selecionados (via `profile_room_permission` e `profile_room_type_permission`)
2. Calcular conjunto de salas cobertas pelos tipos de sala selecionados (via `user_room_type_permission`)
3. União dos dois conjuntos → exibir como badges readonly com tooltip explicativo

Componentes de tooltip:
- `ProfileTooltipContent` — explica qual perfil já cobre aquela sala
- `RoomTypeTooltipContent` — explica qual tipo de sala já cobre aquela sala

---

### Deduplicação visual no formulário de perfil

Mesma lógica para perfis: salas cobertas pelos tipos de sala selecionados aparecem como `readonlyBadge` no `MultiSelect` de salas diretas do perfil.

---

## PERM-005 — Gap: Verificação Unificada no Fluxo IoT

**Status:** 🔧 Parcial — `processAccessAttempt` só verifica PERM-001

### Problema

Em `server/src/services/iot/access.ts`, a função `processAccessAttempt` verifica manualmente apenas `user_room_permission` (PERM-001). Os outros 3 níveis (PERM-002, PERM-003, PERM-004) são ignorados.

Consequência: usuários com acesso concedido via perfil ou via tipo de sala **não conseguem abrir a porta fisicamente**, mesmo que o sistema web mostre que têm permissão.

### Correção necessária

Substituir a verificação manual em `processAccessAttempt` pela chamada a `verifyAccess(userId, roomId)`:

```ts
// ANTES (incorreto — verifica só PERM-001)
const permission = await db.query.userRoomPermission.findFirst({
  where: and(
    eq(userRoomPermission.userId, userId),
    eq(userRoomPermission.roomId, roomId),
  ),
});
const granted = !!permission;

// DEPOIS (correto — verifica os 4 níveis)
import { verifyAccess } from "@/services/permissions/verify-access";

const { granted, reason } = await verifyAccess(userId, roomId);
```

O `reason` retornado por `verifyAccess` deve ser usado ao registrar o `access_log`.

### Arquivos envolvidos

- `server/src/services/iot/access.ts` — modificar `processAccessAttempt`
- `server/src/services/permissions/verify-access.ts` — reutilizar sem modificação