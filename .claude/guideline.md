# Guia de Padrões e Convenções de Código

Padrões adotados no projeto de controle de acesso IoT (IFSP-PEP). Seguir estas convenções garante consistência entre os módulos `server/`, `app/` e `iot/`.

---

## Geral

- **Linguagem**: TypeScript em todos os módulos (`server/`, `app/`, `iot/`)
- **Linting / Formatação**: Biome (`biome.json` na raiz de cada módulo) — não usar ESLint ou Prettier
- **Imports**: usar alias `@/` para imports absolutos a partir de `src/` (configurado no `tsconfig.json`)
- **Nomenclatura de arquivos**: `kebab-case` para todos os arquivos (ex: `get-user.ts`, `fingerprint-hand-drawer.tsx`)
- **Nomenclatura de variáveis e funções**: `camelCase`
- **Nomenclatura de tipos e interfaces**: `PascalCase`
- **Nomenclatura de constantes**: `UPPER_SNAKE_CASE` para constantes globais, `camelCase` para constantes de escopo local
- **Comentários**: minimizar — o código deve ser autoexplicativo. Comentários apenas quando o "porquê" não é óbvio pelo código

---

## Backend (`server/`)

### Estrutura de uma rota Fastify

Todas as rotas usam `fastify-type-provider-zod` para tipagem automática de request/reply.

```ts
// server/src/api/routes/exemplo.ts
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "@/lib/zod";

export const exemploRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/exemplo/:id",
    {
      schema: {
        tags: ["Exemplo"],
        summary: "Descrição curta da rota",
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ id: z.string(), name: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      // lógica aqui
      return reply.status(200).send({ id, name: "Exemplo" });
    },
  );
};
```

### Serviços (camada de negócio)

- Ficam em `server/src/services/[domínio]/[ação]-[entidade].ts`
- São funções puras (sem acesso direto ao Fastify, apenas ao banco e a outros serviços)
- Erros de domínio são classes customizadas exportadas do próprio arquivo do serviço
- Não lançar erros HTTP (4xx/5xx) nos serviços — apenas erros de domínio; o mapeamento para HTTP fica na rota

```ts
// Padrão de erro de domínio
export class FingerprintConflictError extends Error {
  constructor() {
    super("Já existe uma digital cadastrada para este dedo.");
  }
}

export async function registerFingerprint(payload: RegisterFingerprintPayload) {
  // ...
  throw new FingerprintConflictError();
}
```

```ts
// Mapeamento na rota
} catch (err) {
  if (err instanceof FingerprintConflictError) {
    return reply.status(409).send({ message: err.message });
  }
  throw err;
}
```

### Schemas Zod

- Definir schemas Zod diretamente na rota ou em um bloco `// ── Schemas ───` antes dos handlers
- Reutilizar schemas entre rotas extraindo para variáveis nomeadas com sufixo `Schema`
- Usar `z.object({ ... })` sempre — evitar `z.any()`
- Para enums do banco (Drizzle), converter para schema Zod assim:

```ts
const doorStateValues = doorStateEnum.enumValues as [
  (typeof doorStateEnum.enumValues)[number],
  ...(typeof doorStateEnum.enumValues)[number][],
];
const doorStateSchema = z.enum(doorStateValues);
```

### Drizzle ORM

- Schemas ficam em `server/src/db/schema/` separados por domínio: `auth.ts`, `access.ts`, `room.ts`, `profile.ts`, `enums.ts`
- Usar `uuid()` com `.$defaultFn(() => uuidv7())` para IDs
- Usar `timestamp({ withTimezone: true })` para datas
- Migrações manuais ficam em `server/.migrations/` com nome `NNNN_descricao.sql`
- Enums Postgres são definidos em `enums.ts` e importados nos schemas de tabela

### Autenticação (guard)

Usar o helper `requireAdmin` em todas as rotas que exigem autenticação de administrador:

```ts
const session = await requireAdmin(request, reply);
if (!session) return; // reply já foi enviado pelo guard
```

---

## Frontend (`app/`)

### Componentes React

- Componentes em `app/src/components/[domínio]/nome-do-componente.tsx`
- Sempre exportar como `export function NomeDoComponente` (named export, não default)
- Props tipadas com `interface` quando há 3+ props; `type` para tipos simples
- Evitar prop drilling além de 2 níveis — usar TanStack Query ou contexto

```tsx
interface UserFormPanelProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserFormPanel({ userId, onSuccess, onCancel }: UserFormPanelProps) {
  // ...
}
```

### TanStack Query

- Definir `queryOptions` e `queryKeys` junto ao serviço de API (`services/[domínio]/[arquivo].ts`)
- Invalidar queries pelo `queryKey` após mutations — nunca recarregar a página
- Usar `useSuspenseQuery` quando o dado é obrigatório para renderizar o componente

```ts
// services/users/fingerprints.ts
export const fingerprintsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["users", userId, "fingerprints"],
    queryFn: () => fetchUserFingerprints(userId),
  });
```

### TanStack Router

- Rotas em `app/src/routes/` com file-based routing
- Usar `createFileRoute` com loader para pré-carregar dados
- Guards de autenticação/admin no `beforeLoad` da rota

### Nomenclatura de eventos

- Handlers de eventos: prefixo `on` + substantivo + verbo (ex: `onUserDelete`, `onRoomSelect`)
- Props de callback: mesmo padrão `onXxx`

### Estado local

- Preferir `useState` para estado simples de UI (ex: modal aberto, dedo selecionado)
- Preferir TanStack Query para estado de servidor
- Evitar `useEffect` para sincronizar estado derivado — usar `useMemo` ou calcular na renderização

### shadcn/ui

- Usar os componentes base do shadcn (`Button`, `Dialog`, `Drawer`, `Tabs`, etc.) sem modificar os arquivos em `components/ui/`
- Customizações via `className` com `cn()` (utilitário de merge de classes Tailwind)
- Ícones: usar `lucide-react` exclusivamente

### Acessibilidade

- Todo botão deve ter texto visível ou `aria-label` descritivo
- Usar `aria-live="polite"` em regiões com mudança dinâmica de conteúdo
- Suporte a teclado (Tab + Enter/Space) em todos os elementos interativos customizados

---

## IoT / Broker MQTT (`iot/`)

### Estrutura do handler de tópico

```ts
// Padrão de handler no broker
aedes.on("publish", async (packet, client) => {
  if (!packet.topic.startsWith("door/")) return;

  const [, controllerId, action] = packet.topic.split("/");
  const payload = parseJson(packet.payload.toString());
  if (!payload) return;

  try {
    await handleDoorAction(controllerId, action, payload);
  } catch (err) {
    logger.error({ err, topic: packet.topic }, "Erro ao processar mensagem MQTT");
  }
});
```

- Nunca lançar erro sem capturar no handler — erros não tratados derrubam o processo
- Validar payload com Zod antes de processar
- Usar `logger` (Pino) para todos os logs — nunca `console.log`

### Comunicação com o backend

- Usar `undici` (fetch nativo Node.js 18+) para chamadas HTTP
- Base URL do backend configurada via variável de ambiente `BACKEND_URL`
- Tratar falhas de rede com retry simples (1-2 tentativas) antes de logar e descartar

---

## Hardware / Firmware (`core/`)

- Linguagem: C/C++ com framework Arduino (PlatformIO)
- Módulos separados em pares `.h` / `.cpp` por responsabilidade
- Constantes de configuração em `config.h` (nunca hardcoded no `main.cpp`)
- IDs (controllerId, roomId) armazenados em EEPROM
- Logs via `Serial.println()` apenas em modo debug (`#ifdef DEBUG`)
- Nunca usar `delay()` no loop principal — usar `millis()` para temporização não-bloqueante

```cpp
// Padrão de temporização não-bloqueante
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000;

void loop() {
  unsigned long now = millis();
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = now;
  }
}
```

---

## Commits e Branches

- **Mensagens de commit**: `tipo(escopo): descrição curta` (Conventional Commits)
  - `feat(server): adicionar endpoint GET /access-logs`
  - `fix(iot): corrigir verificação de permissão em processAccessAttempt`
  - `chore(app): atualizar dependências`
  - `docs: atualizar arquitetura no .claude/`
- **Branch principal**: `main` — deploys automáticos em push
- **Branches de feature**: `feat/descricao-curta`

---

## Variáveis de Ambiente

- Definir e validar com Zod em `server/src/env.ts` (backend) e `vite.config.ts` / `.env` (frontend)
- Nunca commitar `.env` com valores reais — apenas `.env.example` com placeholders
- Prefixo `VITE_` para variáveis expostas ao frontend (Vite)

```ts
// server/src/env.ts — padrão de validação
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BACKEND_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
```

---

## Tratamento de Erros

| Camada | Abordagem |
|--------|-----------|
| Serviços (server) | Lançar classes de erro de domínio |
| Rotas (server) | Capturar erros de domínio e mapear para HTTP; relançar erros inesperados |
| Frontend | `try/catch` em mutations; exibir mensagem inline no formulário ou toast (ver guideline de UX) |
| Broker MQTT | Capturar tudo no handler; logar com Pino; nunca deixar propagar |
| Firmware | Verificar retorno de funções críticas; logar no Serial em modo debug |

---

## UX / Notificações Toast (Sonner)

Usar Sonner **apenas** quando:

1. O componente de contexto onde a ação ocorreu **não está mais visível** (ex: modal fechou, página navegou), **E**
2. **Não há alteração evidente no layout** que comunique o resultado ao usuário

**Usar toast:**
- Confirmação de operação em background
- Erro em fluxo onde o formulário não está mais visível

**Não usar toast:**
- Erro de login dentro do user-menu aberto → exibir inline no formulário
- Login bem-sucedido → a interface já muda visivelmente (foto de perfil, conteúdo do menu)

> Regra geral: se o usuário consegue ver o resultado diretamente na interface, não use toast.

---

## Segurança

- `isAdmin` é verificado **server-side** em todas as rotas de escrita — o guard no frontend é apenas UX
- Senhas nunca em texto puro — better-auth usa hash seguro (argon2/bcrypt)
- Cookies de sessão são `HttpOnly` — nunca acessíveis via JavaScript
- Templates biométricos armazenados com constraint `UNIQUE` no banco — duplicatas rejeitadas
- Não expor valor completo de credencial (template biométrico) em respostas de listagem