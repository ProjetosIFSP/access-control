# CREDENCIAL — Implementações Realizadas

## CRED-001 — Gestão de Credenciais Físicas: FINGERPRINT

**Status:** 🔧 Parcial — backend e frontend prontos; integração com hardware físico pendente

---

### Banco de Dados

**`server/src/db/schema/enums.ts`** — adicionado `fingerKeyEnum`:
- Enum Postgres com 10 valores representando cada dedo:
  `right_thumb`, `right_index`, `right_middle`, `right_ring`, `right_pinky`,
  `left_thumb`, `left_index`, `left_middle`, `left_ring`, `left_pinky`

**`server/src/db/schema/access.ts`** — coluna `finger` adicionada:
- `finger: fingerKeyEnum("finger").nullable()` — nullable para não afetar credenciais NFC existentes

**`server/.migrations/0001_add_finger_to_access_credential.sql`** — migração executada:
- Cria o tipo `finger_key` no Postgres
- `ALTER TABLE access_credential ADD COLUMN finger finger_key`

---

### Serviços no Servidor

**`server/src/services/user/fingerprint/list-fingerprints.ts`**
- `listFingerprints(userId)` — busca credentials do tipo `FINGERPRINT` de um usuário, ordenadas por `createdAt`
- Retorna `FingerprintRecord[]` com `{ id, finger, isActive, createdAt }`

**`server/src/services/user/fingerprint/register-fingerprint.ts`**
- `registerFingerprint({ userId, finger, template })` — insere nova credential
- Valida unicidade por usuário + dedo: lança `FingerprintConflictError` (409) se já existe digital para aquele dedo
- Campo `value` tem constraint `UNIQUE` global — templates duplicados entre usuários são rejeitados pelo banco

**`server/src/services/user/fingerprint/delete-fingerprint.ts`**
- `deleteFingerprint(userId, credentialId)` — remove credential garantindo que pertence ao usuário e é do tipo `FINGERPRINT`; lança `FingerprintNotFoundError` (404)
- `toggleFingerprint(userId, credentialId, isActive)` — ativa/desativa credential com as mesmas garantias de propriedade

---

### Endpoints REST

Todos em `server/src/api/routes/user.ts`, protegidos por `requireAdmin`, documentados no Swagger:

| Método | Path | Resposta | Descrição |
|--------|------|----------|-----------|
| `GET` | `/users/:id/fingerprints` | 200 | Lista digitais do usuário |
| `POST` | `/users/:id/fingerprints` | 201 / 409 | Cadastra nova digital |
| `DELETE` | `/users/:id/fingerprints/:credentialId` | 204 / 404 | Remove digital |
| `PATCH` | `/users/:id/fingerprints/:credentialId` | 200 / 404 | Ativa/desativa digital |

- Schema Zod `fingerKeySchema` valida o campo `finger` com o enum dos 10 dedos
- `fingerprintSummarySchema` reutilizado nas respostas de GET, POST e PATCH
- Erros de domínio mapeados para HTTP 409/404

---

### Tipos e Constantes (Frontend)

**`app/src/lib/biometrics.ts`** — criado do zero:
- `FingerKey` — union type com os 10 dedos nomeados
- `FINGER_LABELS` — mapa de rótulos em PT-BR (ex: `right_thumb` → `"Polegar direito"`)
- `FINGERS_RIGHT` / `FINGERS_LEFT` — arrays por mão para iterar
- `RIGHT_HAND_ZONES` / `LEFT_HAND_ZONES` — coordenadas `(cx, cy, r)` dos hot-zones SVG por dedo, por mão (normal e Halloween)
- Helpers: `isFingerRegistered(finger, fingerprints)`, `getFingerprintForFinger(finger, fingerprints)`, `countRegisteredInSet(fingers, fingerprints)`

---

### SVG de Mão com Hot-Zones

**`app/src/assets/vectors/hand.tsx`** — refatorado:
- `HotZoneOverlay` — sobrepõe `<foreignObject><button>` acessível sobre cada dedo
  - `aria-label` descritivo incluindo estado ("já cadastrado" ou "não cadastrado")
  - Suporte completo a teclado (Tab + Enter/Space)
  - `title` para tooltip nativo
- Highlight **verde** (anel tracejado + dot) para digitais já cadastradas
- Highlight **azul/primário** para o dedo atualmente selecionado
- Prop `interactive` (falso por padrão — modo display puro)
- Easter egg de Halloween corrigido: `today.date() === 31 && today.month() === 9` (month() é 0-indexed; 9 = outubro)

---

### Hook de Leitura do Leitor Físico

**`app/src/hooks/use-fingerprint-reader.ts`** — criado do zero:

Suporte a dois modos de operação:
- **`"keyboard"`** (padrão, compatível com WA26): cria input oculto, aguarda o leitor "digitar" o template e pressionar Enter
- **`"hid"`**: usa Web HID API com declarações de tipos locais (sem dependência externa)

Interface exposta:
```ts
interface UseFingerprintReaderReturn {
  status: "idle" | "connecting" | "connected" | "waiting" | "reading" | "success" | "error";
  countdown: number;        // regressivo de 30s durante "waiting"
  lastTemplate: string | null;
  errorMessage: string | null;
  connect: () => Promise<void>;
  startCapture: () => void;
  cancelCapture: () => void;
  disconnect: () => void;
  reset: () => void;
}
```

Mensagens de erro amigáveis implementadas:
- "Seu navegador não suporta leitores biométricos USB via HID. Use Google Chrome ou Microsoft Edge."
- "Nenhum leitor selecionado. Conecte o dispositivo e tente novamente."
- "Tempo esgotado. Passe o dedo no leitor e tente novamente."
- "Leitura vazia. Tente novamente."
- "Leitor não conectado. Clique em 'Conectar Leitor' primeiro."

**Pendente de teste físico:**
- `vendorId` e `productId` reais do WA26 em `KNOWN_FINGERPRINT_FILTERS`
- Formato exato do template emitido (hex ISO 19794-2 vs string de teclado)

---

### Serviço de API Client

**`app/src/services/users/fingerprints.ts`** — criado do zero:
- `fetchUserFingerprints(userId)` — GET com query options e query key
- `registerFingerprint(userId, payload)` — POST com invalidação de cache
- `deleteFingerprint(userId, credentialId)` — DELETE
- `toggleFingerprint(userId, credentialId, isActive)` — PATCH
- `fingerprintsQueryOptions(userId)` — query options reutilizáveis

---

### Componente Principal: `FingerprintHandDrawer`

**`app/src/components/users/fingerprint-hand-drawer.tsx`** — criado do zero:

Drawer estilizado como "gaveta de sala" (abre de baixo, handle com sombra interna, fundo levemente diferente, borda superior espessa):
- **Tabs** Mão Direita / Esquerda com contagem de digitais por mão
- **SVG interativo** da mão com `HotZoneOverlay`
- **Indicador de status do leitor** com spinner animado no botão "Conectar"
- **Auto-registro**: ao capturar template via hook, envia para a API automaticamente sem intervenção manual
- **Lista de digitais cadastradas** com botão de remoção por item e `aria-label` acessível
- **Loading state individual** por botão de remoção (`isDeletingId === fp.id`)
- Skeleton (`Loader2`) durante carregamento das digitais existentes

---

### Componente de Feedback Visual: `FingerprintCaptureFeedback`

**`app/src/components/users/fingerprint-capture-feedback.tsx`** — criado do zero:

5 estados animados com ícones e cores semânticas:
| Estado | Visual |
|--------|--------|
| `idle` | Ícone de digital cinza |
| `waiting` | Ring de countdown animado + número regressivo |
| `reading` | Pulse animado em azul |
| `success` | Check verde |
| `error` | Alerta vermelho + botão "Tentar novamente" |

- `aria-live="polite"` e `aria-atomic="true"` para anúncio via screen reader

---

### Integração na Tabela de Usuários

**`app/src/components/users/users-table.tsx`** — modificado:
- Item "Gerenciar Digitais" (ícone `Fingerprint`) no menu de ações de cada linha
- Badge roxo com contagem de digitais quando `fingerprintCount > 0`
- Tooltip explicativo no badge: "N digital(is) cadastrada(s)"

**`app/src/routes/users.tsx`** — modificado:
- Estado `fingerprintTarget` controla para qual usuário o drawer está aberto
- `onOpenChange` do drawer chama `invalidateUsers()` ao fechar, atualizando o badge de contagem

---

### `UserSummary` com `fingerprintCount`

**`server/src/services/user/get-user.ts`** — modificado:
- Subquery SQL no `SELECT` conta credentials `FINGERPRINT` por usuário:
  ```sql
  (SELECT COUNT(*) FROM access_credential
   WHERE user_id = user.id AND type = 'FINGERPRINT') AS fingerprint_count
  ```

**`server/src/api/routes/user.ts`** — modificado:
- `userSummarySchema` inclui `fingerprintCount: z.number()`
- Handler do `GET /users` mapeia o campo na serialização

**`app/src/services/users/types.ts`** — modificado:
- `UserSummary` inclui `fingerprintCount: number`

---

## CRED-002 — Gestão de Credenciais Físicas: NFC_TAG

**Status:** ⬜ Não iniciado

A tabela `access_credential` já suporta o tipo `NFC_TAG` (enum `credentialTypeEnum`). Faltam:
- Endpoints REST `GET/POST/DELETE/PATCH /users/:id/nfc-tags`
- Serviços no servidor analogos aos de fingerprint
- UI de cadastro de tag NFC por usuário (UI-012)
- Integração no firmware do ESP32 com o leitor RC522