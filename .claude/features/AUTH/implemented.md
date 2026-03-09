# AUTH — Implementações Realizadas

## AUTH-001 — Autenticação via Cookie (better-auth)

**Status:** ✅ Concluído

---

### Tecnologia

[better-auth](https://better-auth.com) — framework de autenticação para TypeScript com suporte nativo a Drizzle ORM e sessões por cookie HttpOnly.

---

### Configuração

**`server/src/lib/auth.ts`**

- Instância do `betterAuth` configurada com:
  - Adapter Drizzle apontando para o banco PostgreSQL
  - Plugin `admin` habilitado (campo `isAdmin` no schema de usuário)
  - Cookie de sessão HttpOnly (não acessível via JavaScript)
  - CORS configurado para aceitar credenciais do frontend

**`server/src/lib/auth-client.ts`**

- Cliente de autenticação exportado para uso no servidor (verificação de sessão nas rotas)

---

### Rotas montadas

**`server/src/api/routes/auth.ts`**

As rotas do better-auth são montadas como handler genérico do Fastify, delegando todo o processamento para a instância `auth`:

| Método | Path | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/sign-in/email` | Login com email e senha |
| `POST` | `/api/auth/sign-out` | Logout (invalida sessão) |
| `GET` | `/api/auth/session` | Retorna sessão atual |
| `GET` | `/api/auth/me` | Dados do usuário logado |

---

### Guard de autenticação/admin

Helper `requireAdmin` implementado em `server/src/api/routes/user.ts` e reutilizado nas demais rotas:

```ts
async function requireAdmin(request, reply) {
  const session = await resolveSession(request);

  if (!session?.user) {
    reply.status(401).send({ message: "Autenticação necessária." });
    return null;
  }

  const isAdmin = !!(session.user as Record<string, unknown>).isAdmin;
  if (!isAdmin) {
    reply.status(403).send({ message: "Acesso restrito a administradores." });
    return null;
  }

  return session;
}
```

**Uso nas rotas:**
```ts
const session = await requireAdmin(request, reply);
if (!session) return; // reply já foi enviado pelo guard
```

---

### Schema de banco (better-auth)

Tabelas gerenciadas pelo better-auth em `server/src/db/schema/auth.ts`:

| Tabela | Descrição |
|--------|-----------|
| `user` | Usuários com campos padrão + `isAdmin: boolean` |
| `account` | Provedores de auth vinculados (email/senha, OAuth futuro) |
| `session` | Sessões ativas com `expiresAt` e `token` único |
| `verification` | Tokens de verificação de email e reset de senha |

---

### Segurança implementada

- Senhas armazenadas com hash seguro (argon2 via better-auth) — nunca em texto puro
- Cookie de sessão `HttpOnly` — não acessível via JavaScript (proteção contra XSS)
- `isAdmin` verificado server-side em todas as rotas protegidas — o guard no frontend é apenas UX
- Tokens de sessão únicos e não previsíveis (gerados pelo better-auth)

---

### Integração no frontend

**`app/src/integrations/`** — configuração do cliente better-auth para o frontend:
- Hook/função para obter sessão atual
- Funções de `signIn` e `signOut`
- Estado de autenticação compartilhado via TanStack Query

**Visibilidade condicional na UI:**
- Campos sensíveis nos cards de sala (`currentUser`, `lastUser`) visíveis apenas para autenticados
- Rotas `/users`, `/profiles`, `/rooms` com guard `beforeLoad` que redireciona para login se não autenticado

---

## AUTH-002 — Redefinição de Senha (forgot/reset)

**Status:** ✅ Concluído

---

### Fluxo implementado

```
1. Usuário acessa /forgot-password e informa o email
2. Frontend chama POST /api/auth/forgot-password
3. better-auth gera token temporário e envia email com link
4. Usuário clica no link → acessa /reset-password?token=XXX
5. Frontend chama POST /api/auth/reset-password com token + nova senha
6. better-auth valida o token, atualiza o hash da senha e invalida o token
7. Usuário é redirecionado para login
```

---

### Páginas de frontend

**`app/src/routes/forgot-password.tsx`**
- Formulário com campo de email
- Chamada a `POST /api/auth/forgot-password`
- Feedback inline de sucesso ("Email enviado — verifique sua caixa de entrada")
- Tratamento de erro para email não cadastrado

**`app/src/routes/reset-password.tsx`**
- Lê o token da query string (`?token=XXX`)
- Formulário com campo de nova senha e confirmação
- Validação client-side de confirmação de senha
- Chamada a `POST /api/auth/reset-password`
- Redirecionamento para `/login` (ou página inicial) após sucesso

---

### Considerações de segurança

- Token de reset tem expiração curta (configurável no better-auth — padrão ~1h)
- Token é invalidado após uso (único uso)
- O email de confirmação não confirma se o endereço existe no sistema (prevenção de enumeração de usuários)