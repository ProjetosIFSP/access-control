# CRED-002 — Plano de Implementação: Gestão de Tags NFC por Usuário

> **Documento de trabalho** — atualizar conforme tarefas forem concluídas.
> Referência: `CRED-001` (fingerprint) como modelo arquitetural para toda esta implementação.

---

## 1. Visão Geral e Decisões Arquiteturais

### 1.1 Abordagem de cadastro: digitação manual vs. leitura via terminal MQTT

Este plano cobre **duas abordagens** para o cadastro de UIDs NFC no portal. A abordagem padrão para o TCC é a **digitação manual**.

| Critério | Digitação manual ✅ (padrão TCC) | Leitura via terminal MQTT (fase 2) |
|---|---|---|
| Moving parts | Backend + Frontend apenas | Backend + Frontend + Broker + Firmware |
| Risco de falha | Baixo — fluxo HTTP síncrono | Alto — depende de Wi-Fi, MQTT, timing |
| Tempo de implementação | ~1 sessão | ~3 sessões |
| Resultado funcional | Idêntico — tag fica vinculada ao usuário | Idêntico |
| Experiência do admin | Admin lê o UID no Serial Monitor ou na tag e digita | Admin aproxima a tag; portal exibe o UID automaticamente |

**Justificativa da escolha para o TCC:** o objetivo avaliado é o sistema de controle de acesso (abertura de porta via tag NFC), não a UX de cadastro. Introduzir o fluxo MQTT de enrollment agrega complexidade operacional (sincronização de estado entre firmware/broker/frontend, timeout handling, WebSocket na porta 9001) sem agregar valor ao critério de avaliação. O fluxo de acesso real (tag → firmware → MQTT → backend → relé) permanece idêntico em ambas as abordagens.

A abordagem MQTT de enrollment está descrita na Seção 7 deste documento e marcada como `TODO (fase 2)`.

### 1.2 Formato do UID

- **Armazenamento no banco:** string hex uppercase sem separadores — ex: `"A1B2C3D4"` ou `"A3F201CC"` (4 bytes para Mifare Classic/Ultralight; até 7 bytes para tags ISO 14443A de UID longo).
- **Display na UI:** uppercase com separador `:` a cada byte — ex: `"A1:B2:C3:D4"`. Convertido apenas na camada de apresentação pela função `formatUid()`.
- **Entrada no formulário:** aceita com ou sem separadores (o frontend normaliza antes de enviar).
- **Validação no backend:** regex `/^[A-Fa-f0-9]{4,14}$/` — mínimo 4 hex chars (2 bytes), máximo 14 hex chars (7 bytes), sem separadores.

> **Atenção:** o firmware `firmware-nfc-terminal.ino` formata o UID com separadores (`A3:F2:01:CC`). Ao cadastrar via Serial Monitor, o admin deve remover os `:` antes de digitar no campo do portal — **ou** o frontend normaliza automaticamente removendo separadores antes de enviar. Preferir a segunda opção (normalização no frontend) para melhor UX.

### 1.3 Unicidade e constraint de banco

A coluna `value` em `access_credential` já possui constraint `UNIQUE` global. Isso significa:
- Um mesmo UID **não pode ser cadastrado para dois usuários diferentes** — a tentativa gera `PostgresError` com código `23505`.
- Diferente das digitais, **não há constraint de unicidade por usuário** além do UID em si (um usuário pode ter múltiplas tags NFC com UIDs distintos, sem limite de "dedo").

O serviço `registerNfcTag` captura o erro `23505` e lança `NfcTagConflictError` (409), análogo ao `FingerprintDuplicateTemplateError`.

### 1.4 Referência cruzada com CRED-001

Toda a estrutura de CRED-002 espelha CRED-001 (fingerprint). As diferenças são:

| Aspecto | CRED-001 (Fingerprint) | CRED-002 (NFC Tag) |
|---|---|---|
| Campo discriminador | `finger` (enum de 10 dedos) | N/A — apenas `uid` (string) |
| Campo `value` | Template biométrico raw | UID hex sem separadores |
| Unicidade por usuário | `(userId, finger)` — uma digital por dedo | Apenas `value` global — múltiplas tags permitidas |
| Erro de conflito | `FingerprintConflictError` / `FingerprintDuplicateTemplateError` | `NfcTagConflictError` (unifica os dois casos) |
| UI de cadastro | SVG interativo de mão | Formulário com campo texto + lista |
| Hardware de captura | Leitor biométrico ZN-53X | Leitor RFID RC522 via NodeMCU |

### 1.5 Fluxo de acesso NFC (já funcional — não muda com esta feature)

```
Tag NFC aproximada
    ↓
Firmware lê UID via RC522
    ↓
Publica door/{id}/access-attempt
  { credentialType: "NFC_TAG", credentialValue: "A1:B2:C3:D4", controllerId: "..." }
    ↓
Broker MQTT → processAccessAttempt()
  → busca access_credential WHERE value = uid AND type = 'NFC_TAG' AND isActive = true
  → verifica permissão do usuário na sala
    ↓
Publica door/{id}/access-result { status: "GRANTED" | "DENIED" }
    ↓
Firmware aciona relé (GRANTED) ou pisca LED de negação (DENIED)
```

> **Atenção ao formato do UID no fluxo de acesso:** o firmware atual serializa o UID com separadores (`"A3:F2:01:CC"`). O broker deve normalizar (remover `:`) antes de consultar o banco, **ou** o banco deve armazenar com separadores. Definir um padrão único e aplicar consistentemente. **Recomendação:** armazenar sem separadores no banco; normalizar no broker antes de consultar. Verificar em CRED-002.7.

---

## 2. Checklist Geral de Tarefas

- [ ] **CRED-002.1** — Backend: serviços (`listNfcTags`, `registerNfcTag`, `deleteNfcTag`, `toggleNfcTag`)
- [ ] **CRED-002.2** — Backend: endpoints REST (`GET/POST/DELETE/PATCH /users/:id/nfc-tags`) + `nfcTagCount` no `UserSummary`
- [ ] **CRED-002.3** — Frontend: tipos, constantes e utilitários NFC (`app/src/lib/nfc.ts`)
- [ ] **CRED-002.4** — Frontend: serviço de API client (`app/src/services/users/nfc-tags.ts`)
- [ ] **CRED-002.5** — Frontend: componente `NfcTagDrawer`
- [ ] **CRED-002.6** — Frontend: integração na tabela de usuários (badge de contagem + menu)
- [ ] **CRED-002.7** — Firmware: validação end-to-end do fluxo de acesso com NFC_TAG
- [ ] **CRED-002.8** — Teste de ponta a ponta (checklist físico)

---

## 3. Detalhamento por Subtarefa

---

### CRED-002.1 — Serviços no Backend

**Localização:** `server/src/services/user/nfc/`

Criar quatro arquivos, análogos exatos aos de fingerprint:

---

#### `list-nfc-tags.ts`

```tcc/server/src/services/user/nfc/list-nfc-tags.ts#L1-20
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";

export interface NfcTagRecord {
  id: string;
  uid: string;       // valor armazenado no banco (hex sem separadores)
  isActive: boolean;
  createdAt: Date;
}

export async function listNfcTags(userId: string): Promise<NfcTagRecord[]> {
  const rows = await db
    .select({ id: accessCredential.id, value: accessCredential.value,
               isActive: accessCredential.isActive, createdAt: accessCredential.createdAt })
    .from(accessCredential)
    .where(and(eq(accessCredential.userId, userId), eq(accessCredential.type, "NFC_TAG")))
    .orderBy(asc(accessCredential.createdAt));

  return rows.map((row) => ({ id: row.id, uid: row.value, isActive: row.isActive, createdAt: row.createdAt }));
}
```

- Retorna `NfcTagRecord[]` com `uid` mapeado de `value` — a UI nunca vê o nome interno `value`.
- Ordenação por `createdAt` ASC (tags mais antigas primeiro, consistente com fingerprints).

---

#### `register-nfc-tag.ts`

```tcc/server/src/services/user/nfc/register-nfc-tag.ts#L1-45
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";

export interface RegisterNfcTagInput {
  userId: string;
  uid: string;  // hex sem separadores, já normalizado pelo caller
}

export interface RegisteredNfcTagRecord {
  id: string;
  uid: string;
  isActive: boolean;
  createdAt: Date;
}

export class NfcTagConflictError extends Error {
  constructor() {
    super("Este UID já está cadastrado no sistema para outro usuário.");
    this.name = "NfcTagConflictError";
  }
}

export async function registerNfcTag(
  input: RegisterNfcTagInput,
): Promise<RegisteredNfcTagRecord> {
  const { userId, uid } = input;

  try {
    const [inserted] = await db
      .insert(accessCredential)
      .values({ id: uuidv7(), userId, type: "NFC_TAG", value: uid, isActive: true })
      .returning({ id: accessCredential.id, value: accessCredential.value,
                   isActive: accessCredential.isActive, createdAt: accessCredential.createdAt });

    return { id: inserted.id, uid: inserted.value, isActive: inserted.isActive, createdAt: inserted.createdAt };
  } catch (err) {
    if (isUniqueViolation(err)) throw new NfcTagConflictError();
    throw err;
  }
}
```

**Notas:**
- Não há enum de "slot" para NFC (diferente de `finger`). Um usuário pode ter N tags.
- O campo `finger` permanece `null` para credenciais NFC — a coluna é `nullable()` no schema.
- `NfcTagConflictError` é único (não há dois casos distintos como no fingerprint) porque a única violação possível é `UNIQUE(value)`.

---

#### `delete-nfc-tag.ts`

Arquivo único com `deleteNfcTag` e `toggleNfcTag`:

```tcc/server/src/services/user/nfc/delete-nfc-tag.ts#L1-55
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";

export class NfcTagNotFoundError extends Error {
  constructor() {
    super("Tag NFC não encontrada ou não pertence a este usuário.");
    this.name = "NfcTagNotFoundError";
  }
}

export async function deleteNfcTag(
  userId: string,
  credentialId: string,
): Promise<void> {
  const deleted = await db
    .delete(accessCredential)
    .where(and(
      eq(accessCredential.id, credentialId),
      eq(accessCredential.userId, userId),
      eq(accessCredential.type, "NFC_TAG"),
    ))
    .returning({ id: accessCredential.id });

  if (deleted.length === 0) throw new NfcTagNotFoundError();
}

export async function toggleNfcTag(
  userId: string,
  credentialId: string,
  isActive: boolean,
): Promise<{ id: string; uid: string; isActive: boolean; createdAt: Date }> {
  const updated = await db
    .update(accessCredential)
    .set({ isActive })
    .where(and(
      eq(accessCredential.id, credentialId),
      eq(accessCredential.userId, userId),
      eq(accessCredential.type, "NFC_TAG"),
    ))
    .returning({ id: accessCredential.id, value: accessCredential.value,
                 isActive: accessCredential.isActive, createdAt: accessCredential.createdAt });

  if (updated.length === 0) throw new NfcTagNotFoundError();

  const row = updated[0];
  return { id: row.id, uid: row.value, isActive: row.isActive, createdAt: row.createdAt };
}
```

**Checklist CRED-002.1:**
- [ ] Criar `server/src/services/user/nfc/list-nfc-tags.ts`
- [ ] Criar `server/src/services/user/nfc/register-nfc-tag.ts`
- [ ] Criar `server/src/services/user/nfc/delete-nfc-tag.ts` (inclui `toggleNfcTag`)
- [ ] Verificar que `finger: null` é aceito pelo schema ao inserir NFC_TAG (já deve ser — coluna é nullable)

---

### CRED-002.2 — Endpoints REST

**Localização:** `server/src/api/routes/user.ts` (modificar — adicionar após os endpoints de fingerprint)

#### Tabela de endpoints

| Método | Path | Código de sucesso | Erros possíveis | Descrição |
|---|---|---|---|---|
| `GET` | `/users/:id/nfc-tags` | 200 | 401, 403 | Lista tags do usuário |
| `POST` | `/users/:id/nfc-tags` | 201 | 409, 401, 403 | Cadastra nova tag |
| `DELETE` | `/users/:id/nfc-tags/:credentialId` | 204 | 404, 401, 403 | Remove tag |
| `PATCH` | `/users/:id/nfc-tags/:credentialId` | 200 | 404, 401, 403 | Ativa/desativa tag |

#### Schemas Zod (definir antes dos handlers)

```tcc/server/src/api/routes/user.ts#L1-30
// ── NFC Tag Schemas ──────────────────────────────────────────────────────────

const nfcTagSummarySchema = z.object({
  id: z.string().uuid(),
  uid: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

// POST body: aceita hex com ou sem separadores — normalização feita aqui
const registerNfcTagBodySchema = z.object({
  uid: z
    .string()
    .min(1, "UID é obrigatório")
    .transform((val) => val.replace(/[:\s-]/g, "").toUpperCase())
    .pipe(
      z
        .string()
        .regex(/^[A-F0-9]{4,14}$/, "UID inválido — deve conter entre 2 e 7 bytes em hexadecimal"),
    ),
});

const toggleNfcTagBodySchema = z.object({
  isActive: z.boolean(),
});

const nfcTagParamsSchema = z.object({
  id: z.string().uuid(),
  credentialId: z.string().uuid(),
});
```

#### Estrutura dos handlers (referência — não código final)

```tcc/server/src/api/routes/user.ts#L1-50
// GET /users/:id/nfc-tags
app.get("/users/:id/nfc-tags", {
  schema: {
    tags: ["Usuários", "Credenciais"],
    summary: "Lista tags NFC do usuário",
    params: z.object({ id: z.string().uuid() }),
    response: { 200: z.array(nfcTagSummarySchema) },
  },
}, async (request, reply) => {
  const session = await requireAdmin(request, reply);
  if (!session) return;
  const tags = await listNfcTags(request.params.id);
  return reply.status(200).send(tags.map(toNfcTagSummary));
});

// POST /users/:id/nfc-tags
app.post("/users/:id/nfc-tags", {
  schema: {
    tags: ["Usuários", "Credenciais"],
    summary: "Cadastra nova tag NFC para o usuário",
    params: z.object({ id: z.string().uuid() }),
    body: registerNfcTagBodySchema,
    response: { 201: nfcTagSummarySchema, 409: z.object({ message: z.string() }) },
  },
}, async (request, reply) => {
  const session = await requireAdmin(request, reply);
  if (!session) return;
  try {
    const tag = await registerNfcTag({ userId: request.params.id, uid: request.body.uid });
    return reply.status(201).send(toNfcTagSummary(tag));
  } catch (err) {
    if (err instanceof NfcTagConflictError)
      return reply.status(409).send({ message: err.message });
    throw err;
  }
});
```

> A função serializer `toNfcTagSummary` converte `createdAt: Date` para `createdAt: string` (ISO 8601), análoga ao padrão existente de fingerprints.

#### `nfcTagCount` no `UserSummary`

Em `server/src/services/user/get-user.ts`, adicionar subquery análoga a `fingerprintCount`:

```tcc/server/src/services/user/get-user.ts#L1-15
// Dentro do SELECT do listUsers / getUser:
nfcTagCount: db.$count(
  accessCredential,
  and(
    eq(accessCredential.userId, user.id),
    eq(accessCredential.type, "NFC_TAG"),
  ),
),
```

Em `server/src/api/routes/user.ts`, adicionar `nfcTagCount: z.number()` ao `userSummarySchema`.

Em `app/src/services/users/types.ts`, adicionar `nfcTagCount: number` ao tipo `UserSummary`.

**Checklist CRED-002.2:**
- [ ] Definir `nfcTagSummarySchema`, `registerNfcTagBodySchema`, `toggleNfcTagBodySchema`, `nfcTagParamsSchema` em `user.ts`
- [ ] Implementar `GET /users/:id/nfc-tags`
- [ ] Implementar `POST /users/:id/nfc-tags` com normalização de UID e tratamento de `NfcTagConflictError`
- [ ] Implementar `DELETE /users/:id/nfc-tags/:credentialId` com tratamento de `NfcTagNotFoundError`
- [ ] Implementar `PATCH /users/:id/nfc-tags/:credentialId` com tratamento de `NfcTagNotFoundError`
- [ ] Adicionar subquery `nfcTagCount` ao `UserSummary` no backend
- [ ] Adicionar `nfcTagCount` ao `userSummarySchema` Zod
- [ ] Adicionar `nfcTagCount: number` ao tipo `UserSummary` no frontend
- [ ] Testar todos os endpoints via Swagger UI (`/docs`)

---

### CRED-002.3 — Tipos e Constantes no Frontend

**Localização:** `app/src/lib/nfc.ts` (criar)

```tcc/app/src/lib/nfc.ts#L1-40
// Tipo espelhando nfcTagSummarySchema do backend
export type NfcTagSummary = {
  id: string;
  uid: string;        // hex sem separadores (ex: "A1B2C3D4")
  isActive: boolean;
  createdAt: string;  // ISO 8601
};

// Regex para validação client-side no formulário
// Aceita hex com ou sem separadores ":", "-", " "
export const NFC_UID_INPUT_REGEX = /^([0-9A-Fa-f]{2}[:\s-]?){2,7}[0-9A-Fa-f]{0}$/;

// Normaliza o UID antes de enviar: remove separadores, uppercase
export function normalizeUid(raw: string): string {
  return raw.replace(/[:\s-]/g, "").toUpperCase();
}

// Formata o UID para display: uppercase, grupos de 2 separados por ":"
// Ex: "A1B2C3D4" → "A1:B2:C3:D4"
export function formatUid(uid: string): string {
  const clean = normalizeUid(uid);
  return clean.match(/.{1,2}/g)?.join(":") ?? uid;
}

// Valida se a string de entrada (com ou sem separadores) é um UID NFC válido
export function isValidUidInput(raw: string): boolean {
  const clean = normalizeUid(raw);
  return /^[A-F0-9]{4,14}$/.test(clean);
}
```

**Checklist CRED-002.3:**
- [ ] Criar `app/src/lib/nfc.ts` com `NfcTagSummary`, `normalizeUid`, `formatUid`, `isValidUidInput`, `NFC_UID_INPUT_REGEX`
- [ ] Verificar que `formatUid("A1B2C3D4")` → `"A1:B2:C3:D4"` ✓
- [ ] Verificar que `normalizeUid("A1:B2:C3:D4")` → `"A1B2C3D4"` ✓
- [ ] Verificar que `isValidUidInput("A1:B2:C3:D4")` → `true` ✓
- [ ] Verificar que `isValidUidInput("ZZZ")` → `false` ✓

---

### CRED-002.4 — Serviço de API Client

**Localização:** `app/src/services/users/nfc-tags.ts` (criar)

Estrutura análoga a `fingerprints.ts`:

```tcc/app/src/services/users/nfc-tags.ts#L1-80
import { queryOptions } from "@tanstack/react-query";
import { normalizeUid } from "@/lib/nfc";
import type { NfcTagSummary } from "@/lib/nfc";
import { usersQueryKeys } from "./index";

// ── Configuração de URL (idêntica ao padrão do projeto) ──────────────────────
declare const __API_BASE_URL__: string | undefined;
const API_BASE_URL = /* ... mesmo padrão de fingerprints.ts ... */;

// ── Query Keys ────────────────────────────────────────────────────────────────
export const nfcTagQueryKeys = {
  list: (userId: string) => [...usersQueryKeys.all, userId, "nfc-tags"] as const,
};

// ── API Functions ─────────────────────────────────────────────────────────────
export async function fetchUserNfcTags(userId: string): Promise<NfcTagSummary[]> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/nfc-tags`, { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar as tags NFC do usuário");
  return res.json();
}

export async function registerNfcTag(
  userId: string,
  payload: { uid: string },
): Promise<NfcTagSummary> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/nfc-tags`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    // Normalizar no cliente também — defesa em profundidade
    body: JSON.stringify({ uid: normalizeUid(payload.uid) }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Falha ao cadastrar a tag NFC");
  }
  return res.json();
}

export async function deleteNfcTag(userId: string, credentialId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/nfc-tags/${credentialId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Falha ao remover a tag NFC");
  }
}

export async function toggleNfcTag(
  userId: string,
  credentialId: string,
  isActive: boolean,
): Promise<NfcTagSummary> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/nfc-tags/${credentialId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Falha ao alterar o status da tag NFC");
  }
  return res.json();
}

// ── Query Options ─────────────────────────────────────────────────────────────
export const userNfcTagsQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: nfcTagQueryKeys.list(userId ?? ""),
    queryFn: () => fetchUserNfcTags(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
```

**Checklist CRED-002.4:**
- [ ] Criar `app/src/services/users/nfc-tags.ts`
- [ ] `fetchUserNfcTags` — GET com query options
- [ ] `registerNfcTag` — POST com normalização de UID antes de enviar
- [ ] `deleteNfcTag` — DELETE
- [ ] `toggleNfcTag` — PATCH
- [ ] `userNfcTagsQueryOptions` com `enabled: !!userId` e `staleTime` de 2 minutos

---

### CRED-002.5 — Componente `NfcTagDrawer`

**Localização:** `app/src/components/users/nfc-tag-drawer.tsx` (criar)

#### Interface e comportamento

O drawer segue o mesmo estilo visual do `FingerprintHandDrawer`:
- Abre de baixo (bottom sheet) com animação `motion/react`
- Handle + sombra interna + borda superior diferenciada
- Título com nome do usuário

#### Layout interno

```
┌─────────────────────────────────────┐
│  ▬  (handle)                        │
│                                     │
│  Tags NFC — [Nome do usuário]       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ UID  [ A1:B2:C3:D4        ] │    │
│  │      ℹ️ Obtenha o UID via   │    │
│  │      Serial Monitor         │    │
│  │                             │    │
│  │         [ Cadastrar ]       │    │
│  └─────────────────────────────┘    │
│                                     │
│  Tags cadastradas (2)               │
│  ┌─────────────────────────────┐    │
│  │ 💳 A1:B2:C3:D4   [●] [ ✕ ] │    │
│  │ 💳 FF:00:AB:12   [○] [ ✕ ] │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

#### Props

```tcc/app/src/components/users/nfc-tag-drawer.tsx#L1-12
interface NfcTagDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}
```

#### Comportamentos detalhados

**Formulário de cadastro:**
- Input controlado com valor sendo formatado visualmente conforme o usuário digita (não obrigatório — pode ser simples)
- Validação on-blur com `isValidUidInput()` — mensagem de erro inline (não toast)
- Ao submeter: chama `registerNfcTag`, invalida `nfcTagQueryKeys.list(userId)`, limpa o campo
- Erro 409 exibido inline abaixo do campo ("`Este UID já está cadastrado no sistema`")
- Botão "Cadastrar" desabilitado durante `isPending` da mutation

**Lista de tags:**
- Exibir `formatUid(tag.uid)` — nunca o valor raw sem separadores
- Ícone `CreditCard` (lucide) à esquerda de cada item
- Toggle de ativo/inativo: `Switch` do shadcn/ui, estado inicial = `tag.isActive`
- Loading individual por toggle: `switchLoadingId === tag.id`
- Botão de remoção: `X` com `aria-label="Remover tag {formatUid(tag.uid)}"`
- Loading individual por remoção: `deletingId === tag.id`
- Estado vazio: mensagem "`Nenhuma tag NFC cadastrada para este usuário`"

**Nota informativa:**
```
ℹ️ Para obter o UID: conecte o NodeMCU com o firmware NFC ao Serial Monitor
   (115200 baud) e aproxime a tag. O UID aparece no formato A1:B2:C3:D4.
   Você pode digitar com ou sem os separadores ":".
```

**Botão "Ler via Terminal" (TODO — fase 2):**
```tcc/app/src/components/users/nfc-tag-drawer.tsx#L1-5
{/* TODO (CRED-002 fase 2): botão "Ler via Terminal" — fluxo MQTT enrollment
    Ao clicar: publicar via MQTT WS na porta 9001 para o terminal entrar em modo leitura.
    Aguardar publicação em door/{id}/nfc-enrollment-result com timeout de 30s.
    Preencher o campo uid automaticamente com o UID recebido. */}
```

**Checklist CRED-002.5:**
- [ ] Criar `app/src/components/users/nfc-tag-drawer.tsx`
- [ ] Formulário com campo `uid`, validação inline, botão "Cadastrar"
- [ ] Mutation de cadastro com `useMutation` + invalidação de cache
- [ ] Lista de tags com `useQuery(userNfcTagsQueryOptions(...))`
- [ ] Toggle ativo/inativo com loading individual (`Switch` do shadcn)
- [ ] Remoção com loading individual
- [ ] `formatUid()` em todos os lugares onde o UID é exibido
- [ ] Nota informativa sobre Serial Monitor
- [ ] Marcador `TODO` para fluxo MQTT (fase 2)
- [ ] Estado de loading do fetch inicial (skeleton ou `Loader2`)
- [ ] Acessibilidade: `aria-label` em todos os botões de ação

---

### CRED-002.6 — Integração na Tabela de Usuários

**Localização:** `app/src/components/users/users-table.tsx` (modificar)

#### Item no menu de ações

Adicionar após o item "Gerenciar Digitais":

```tcc/app/src/components/users/users-table.tsx#L1-10
<DropdownMenuItem
  onSelect={() => onNfcTagsOpen(user)}
>
  <CreditCard className="size-4" />
  Gerenciar Tags NFC
</DropdownMenuItem>
```

Ícone: `CreditCard` do lucide — semântico para cartão/tag de acesso físico.

#### Badge de contagem

Análogo ao badge roxo de digitais, mas com cor diferente para distinção visual (sugestão: `text-blue-600 bg-blue-50` ou a cor de acento do sistema — escolher na implementação):

```tcc/app/src/components/users/users-table.tsx#L1-15
{user.nfcTagCount > 0 && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
        <CreditCard className="size-3" />
        {user.nfcTagCount}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      {user.nfcTagCount} tag{user.nfcTagCount !== 1 ? "s" : ""} NFC cadastrada{user.nfcTagCount !== 1 ? "s" : ""}
    </TooltipContent>
  </Tooltip>
)}
```

#### Estado no componente pai (`routes/users.tsx`)

Análogo ao `fingerprintTarget`:

```tcc/app/src/routes/users.tsx#L1-10
const [nfcTagTarget, setNfcTagTarget] = useState<UserSummary | null>(null);

// No JSX:
<NfcTagDrawer
  open={!!nfcTagTarget}
  onOpenChange={(open) => {
    if (!open) {
      setNfcTagTarget(null);
      invalidateUsers(); // atualiza nfcTagCount no badge
    }
  }}
  userId={nfcTagTarget?.id ?? ""}
  userName={nfcTagTarget?.name ?? ""}
/>
```

**Checklist CRED-002.6:**
- [ ] Adicionar `nfcTagCount` ao tipo `UserSummary` no frontend (já listado em CRED-002.2)
- [ ] Adicionar item "Gerenciar Tags NFC" no menu de ações da tabela
- [ ] Adicionar badge de contagem com tooltip
- [ ] Adicionar `nfcTagTarget` state em `routes/users.tsx`
- [ ] Instanciar `<NfcTagDrawer>` em `routes/users.tsx` com `invalidateUsers` no `onOpenChange`
- [ ] Verificar que fechar o drawer atualiza o badge de contagem

---

### CRED-002.7 — Validação do Fluxo de Acesso (Firmware → MQTT → Backend)

Esta subtarefa não envolve código novo — é uma sessão de teste para confirmar que o pipeline já existente funciona com tags NFC cadastradas via portal.

#### Pré-requisitos

- NodeMCU v3 + RC522 montados conforme pinout do firmware (SPI):
  - RC522 SDA (SS) → D8 (GPIO15)
  - RC522 SCK → D5 (GPIO14)
  - RC522 MOSI → D7 (GPIO13)
  - RC522 MISO → D6 (GPIO12)
  - RC522 RST → D3 (GPIO0)
  - RC522 VCC → 3V3 / GND
- Arduino IDE com bibliotecas: `PubSubClient`, `MFRC522`, `ArduinoJson`
- Broker MQTT rodando em `localhost:1883`
- Backend rodando em `localhost:3333`
- `CONTROLLER_ID` no firmware deve corresponder a um `door_controller.id` cadastrado no banco (com `roomId` definido)

#### Atenção: formato do UID no fluxo de acesso

O firmware `firmware-nfc-terminal.ino` formata o UID **com separadores** (`"A3:F2:01:CC"`) no campo `credentialValue` do `access-attempt`. O banco armazena **sem separadores** (`"A3F201CC"`). Há duas soluções:

**Opção A (recomendada):** normalizar no broker antes de consultar o banco.
Em `processAccessAttempt()`, antes de buscar a credencial:
```tcc/iot/src/mqtt/handlers/access-attempt.ts#L1-3
const normalizedValue = payload.credentialValue.replace(/[:\s-]/g, "").toUpperCase();
// usar normalizedValue na query ao banco
```

**Opção B:** armazenar no banco com separadores (não recomendado — inconsistente com o padrão hex do sistema).

Verificar qual das opções já está implementada em `processAccessAttempt` antes de fazer qualquer mudança.

#### Passo a passo de validação

1. **Carregar firmware:** abrir `firmware-nfc-terminal.ino`, preencher `WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_SERVER`, `CONTROLLER_ID`. Compilar e carregar no NodeMCU. Abrir Serial Monitor (115200 baud).

2. **Confirmar conexão:** verificar no Serial Monitor que aparece `[MQTT] Conectado` e `[MQTT] Register publicado`. Verificar no banco que `door_controller.lastSeenAt` atualizou.

3. **Cadastrar tag via portal:** navegar para `/users` → selecionar usuário → "Gerenciar Tags NFC" → ler o UID no Serial Monitor ao aproximar a tag → digitar o UID no campo → clicar "Cadastrar". Confirmar que a tag aparece na lista.

4. **Verificar permissão:** confirmar que o usuário tem permissão na sala associada ao `CONTROLLER_ID` (via `/users` → aba de permissões).

5. **Testar acesso:** aproximar a tag do RC522. No Serial Monitor, verificar:
   ```
   [NFC] Tag detectada: A3:F2:01:CC
   [NFC] Access-attempt publicado — UID: A3:F2:01:CC
   [MQTT] Resultado recebido: GRANTED
   ```

6. **Verificar log no banco:** `SELECT * FROM access_log ORDER BY created_at DESC LIMIT 5;` — deve aparecer registro com `status = 'GRANTED'`, `user_id` correto, `controller_id` correto.

7. **Testar negação:** aproximar uma tag **não cadastrada**. Verificar `DENIED` no Serial Monitor e registro em `access_log` com `status = 'DENIED'`.

8. **Testar tag inativa:** desativar a tag no portal (toggle → inativo). Aproximar a tag. Verificar `DENIED`.

**Checklist CRED-002.7:**
- [ ] Verificar/corrigir normalização de UID em `processAccessAttempt` (remover separadores antes de consultar)
- [ ] Carregar firmware no NodeMCU e confirmar conexão MQTT
- [ ] Confirmar `door_controller` cadastrado com `roomId` correto
- [ ] Testar acesso com tag cadastrada + usuário com permissão → `GRANTED`
- [ ] Verificar `access_log` com `status = 'GRANTED'`
- [ ] Testar tag não cadastrada → `DENIED`
- [ ] Testar tag desativada → `DENIED`
- [ ] Testar timeout de `access-result` (broker offline por 6s) → firmware retorna ao IDLE após 5s

---

### CRED-002.8 — Teste de Ponta a Ponta

Checklist final de validação completa do fluxo CRED-002 após todas as subtarefas implementadas:

#### Backend
- [ ] `GET /users/:id/nfc-tags` retorna `[]` para usuário sem tags
- [ ] `POST /users/:id/nfc-tags` com UID válido retorna 201 e a tag criada
- [ ] `POST /users/:id/nfc-tags` com UID já cadastrado (mesmo ou outro usuário) retorna 409
- [ ] `POST /users/:id/nfc-tags` com UID inválido (não-hex) retorna 400
- [ ] `POST /users/:id/nfc-tags` com UID com separadores é normalizado e aceito
- [ ] `DELETE /users/:id/nfc-tags/:credentialId` com ID correto retorna 204
- [ ] `DELETE /users/:id/nfc-tags/:credentialId` com ID de outro usuário retorna 404
- [ ] `PATCH /users/:id/nfc-tags/:credentialId` com `{ isActive: false }` retorna 200 com `isActive: false`
- [ ] `GET /users` retorna `nfcTagCount` correto para cada usuário
- [ ] Todas as rotas retornam 401/403 sem sessão de admin

#### Frontend
- [ ] Badge de contagem aparece/desaparece conforme tags cadastradas
- [ ] Drawer abre e lista as tags do usuário correto
- [ ] Formulário rejeita UIDs inválidos com mensagem inline (não toast)
- [ ] Formulário aceita UIDs com separadores e os normaliza
- [ ] Cadastro bem-sucedido: lista atualiza, campo limpa, sem toast desnecessário
- [ ] Cadastro com UID duplicado: mensagem de erro inline ("já cadastrado")
- [ ] Toggle de ativo/inativo persiste após fechar e reabrir o drawer
- [ ] Remoção de tag: item desaparece da lista imediatamente (optimistic ou após invalidação)
- [ ] Fechar o drawer atualiza o badge de contagem na tabela
- [ ] `formatUid()` exibe separadores em todos os pontos de display

#### Broker MQTT
- [ ] `processAccessAttempt` normaliza o UID antes de consultar o banco
- [ ] Tag ativa + permissão → `GRANTED` publicado em `door/{id}/access-result`
- [ ] Tag ativa + sem permissão → `DENIED` publicado
- [ ] Tag não cadastrada → `DENIED` publicado
- [ ] Tag desativada (`isActive = false`) → `DENIED` publicado
- [ ] Log gravado em `access_log` para todos os casos

#### Firmware (NodeMCU + RC522)
- [ ] Serial Monitor exibe UID formatado (`A1:B2:C3:D4`) ao aproximar a tag
- [ ] `access-attempt` publicado com `credentialType: "NFC_TAG"`
- [ ] LED pisca ao detectar tag (debounce visual)
- [ ] LED acende fixo por 1,5s no GRANTED; pisca rápido no DENIED
- [ ] Debounce de 3s: a mesma tag não dispara segundo attempt em seguida
- [ ] Timeout de 5s: retorna ao IDLE se `access-result` não chegar

---

## 4. Ordem de Implementação Recomendada

```
CRED-002.1 (serviços backend)
    ↓
CRED-002.2 (endpoints REST + nfcTagCount)
    ↓                           ↓
CRED-002.3 (tipos frontend)   Testar endpoints via Swagger
CRED-002.4 (API client)
    ↓
CRED-002.5 (NfcTagDrawer)
    ↓
CRED-002.6 (integração na tabela)
    ↓
CRED-002.7 (validação física do fluxo de acesso)
    ↓
CRED-002.8 (teste de ponta a ponta)
```

**Por que backend antes do frontend:**
O serviço de API client (`nfc-tags.ts`) depende dos endpoints estarem definidos para saber as URLs, os shapes de request/response e os códigos HTTP de erro. Implementar o backend primeiro permite validar os contratos via Swagger UI antes de escrever uma linha de React — isso reduz o número de iterações no frontend.

**Por que o teste físico é o último passo:**
O fluxo de acesso via hardware (CRED-002.7 e CRED-002.8) depende de toda a stack estar funcional. Montar o hardware antes de ter backend e frontend prontos significa testar com dados fictícios, o que não valida o fluxo real. O teste físico final valida a integração completa: portal cadastra → broker verifica → firmware abre a porta.

---

## 5. Impacto em Features Existentes

| Feature impactada | Tipo de impacto | Ação necessária |
|---|---|---|
| `MQTT-006 / processAccessAttempt` | Normalização de UID | Garantir que `credentialValue` tem separadores removidos antes de consultar o banco. Ver CRED-002.7. |
| `PERM-005` (verificação de acesso) | Nenhum | NFC_TAG usa o mesmo fluxo `userId → permissão` que fingerprint. Nenhuma mudança necessária. |
| `USER-001 / UserSummary` | Adição de campo | `nfcTagCount` adicionado ao backend e ao tipo frontend. Nenhuma breaking change — campo novo. |
| `UI-003 / users-table` | Adição de UI | Badge + menu item. Sem risco de regressão se implementado de forma aditiva. |
| `LOG-001 / access_log` | Nenhum | Logs de acesso NFC já são gravados pelo fluxo existente. |
| `CRED-001 / fingerprint` | Nenhum | Módulos completamente independentes na mesma tabela (`type` discrimina). |
| Index de features | Atualização de status | Atualizar CRED-002 e UI-012 de ⬜ para 🔧 ao iniciar; ✅ ao concluir. |

---

## 6. Arquivos a Criar / Modificar

### Criar (novos)

| Arquivo | Operação |
|---|---|
| `server/src/services/user/nfc/list-nfc-tags.ts` | Criar |
| `server/src/services/user/nfc/register-nfc-tag.ts` | Criar |
| `server/src/services/user/nfc/delete-nfc-tag.ts` | Criar (inclui `toggleNfcTag`) |
| `app/src/lib/nfc.ts` | Criar |
| `app/src/services/users/nfc-tags.ts` | Criar |
| `app/src/components/users/nfc-tag-drawer.tsx` | Criar |

### Modificar (existentes)

| Arquivo | O que muda |
|---|---|
| `server/src/api/routes/user.ts` | Adicionar 4 endpoints NFC + schemas Zod |
| `server/src/services/user/get-user.ts` | Adicionar subquery `nfcTagCount` |
| `app/src/services/users/types.ts` | Adicionar `nfcTagCount: number` ao `UserSummary` |
| `app/src/components/users/users-table.tsx` | Badge de contagem + item no menu de ações |
| `app/src/routes/users.tsx` | Estado `nfcTagTarget` + instância do `NfcTagDrawer` |
| `iot/src/mqtt/handlers/access-attempt.ts` (ou equivalente) | Normalização de UID antes de consultar o banco |
| `.claude/features/index.md` | Atualizar status de CRED-002 e UI-012 |
| `.claude/features/CREDENCIAL/implemented.md` | Registrar implementação |
| `.claude/features/todo.md` | Mover CRED-002 de pendente para concluído |

---

## 7. Apêndice — Fluxo MQTT de Enrollment (Fase 2 / TODO)

> Esta seção documenta a abordagem alternativa com leitura via terminal MQTT. **Não implementar para o TCC.** Registrado aqui para referência futura.

### Fluxo

```
Admin clica "Ler via Terminal"
    ↓
Frontend publica via MQTT WebSocket (porta 9001):
  door/{terminalId}/nfc-enrollment-start
  { sessionId: "uuid", timeoutMs: 30000 }
    ↓
Firmware recebe → entra em modo de leitura (LED piscando)
    ↓
Usuário aproxima tag → firmware lê UID
    ↓
Firmware publica:
  door/{terminalId}/nfc-enrollment-result
  { sessionId: "uuid", uid: "A3:F2:01:CC" }
    ↓
Frontend recebe via MQTT WS → preenche campo uid automaticamente
    ↓
Admin confirma → frontend chama POST /users/:id/nfc-tags
```

### Componentes adicionais necessários para a fase 2

- **Firmware:** handler para `door/{id}/nfc-enrollment-start` com timeout; publicação de `nfc-enrollment-result`
- **Broker:** novos tópicos `nfc-enrollment-start` e `nfc-enrollment-result`; lógica de sessão com `sessionId`
- **Frontend:** conexão MQTT.js via WebSocket (porta 9001); gestão de estado de enrollment (idle → waiting → received → confirmed); timeout de 30s com countdown visual
- **Backend:** endpoint opcional `POST /iot/nfc-enrollment` para iniciar a sessão de forma autenticada (evitar que clientes não autorizados triguerem leituras no terminal)

### Por que não para o TCC

Além da complexidade operacional já mencionada na Seção 1.1, há um risco de segurança adicional: expor o broker MQTT WebSocket diretamente ao frontend sem autenticação por tópico significa que qualquer cliente pode publicar `nfc-enrollment-start` para qualquer terminal. Mitigar isso exigiria autenticação MQTT (usuário/senha ou TLS) no broker — mais escopo. Para o TCC, a digitação manual tem risco zero neste aspecto.