# UI — Implementações Realizadas

## UI-001 — Página pública `/` — Listagem de salas por bloco

**Status:** ✅ Concluído

**Arquivo:** `app/src/routes/index.tsx`

**O que foi implementado:**
- Listagem de todas as salas agrupadas por bloco
- Filtros combinados: busca por nome, tipo de sala e estado da porta (aberta/fechada/todos)
- Filtros são aplicados localmente (sem refetch) para performance
- Layout responsivo com grid de cards

---

## UI-002 — Cards de sala com informações condicionais

**Status:** ✅ Concluído

**O que foi implementado:**
- Badge de estado da porta (OPEN/CLOSED/UNKNOWN) com cor semântica
- `currentUser` e `lastUser` visíveis **apenas para usuários autenticados**
- Timestamp da última atualização de estado
- Estado "desconhecido" quando nenhum controlador está associado à sala

**Regra de visibilidade:**
- Usuários não autenticados: veem apenas nome da sala, bloco, tipo e estado da porta
- Usuários autenticados: veem também quem está usando a sala e o último usuário registrado

---

## UI-003 — Página `/users` — CRUD de usuários (admin)

**Status:** ✅ Concluído

**Arquivo:** `app/src/routes/users.tsx`

**O que foi implementado:**
- Layout split-view: lista de usuários à esquerda, painel de edição à direita
- Busca local com debounce (sem refetch por busca)
- Pré-carregamento de relações do usuário ao abrir o painel (`USER-002`)
- Dialog de confirmação antes de excluir
- Guard de admin no `beforeLoad` da rota
- Integração com `FingerprintHandDrawer` (ver UI-013)

**Componentes envolvidos:**
- `app/src/components/users/users-table.tsx`
- `app/src/components/users/user-form-panel.tsx`
- `app/src/components/users/user-form-dialog.tsx`
- `app/src/components/users/user-delete-dialog.tsx`

---

## UI-004 — Página `/profiles` — CRUD de perfis (admin)

**Status:** ✅ Concluído

**Arquivo:** `app/src/routes/profiles.tsx`

**O que foi implementado:**
- Layout split-view com busca local
- Formulário de perfil com `MultiSelect` para tipos de sala e salas diretas
- `readonlyBadges` para salas já cobertas pelos tipos de sala selecionados
- Guard de admin no `beforeLoad`

**Componentes envolvidos:**
- `app/src/components/profiles/` (componentes de listagem e formulário)

---

## UI-005 — Página `/rooms` — CRUD de salas e blocos (admin)

**Status:** ✅ Concluído

**Arquivo:** `app/src/routes/rooms.tsx`

**O que foi implementado:**
- Abas: **Salas** / **Blocos** para alternar entre os dois CRUDs
- Split-view em cada aba
- Formulário de sala: seleção de bloco, tipo de sala, capacidade
- CRUD completo de blocos (criar, renomear, excluir)
- Guard de admin

**Componentes envolvidos:**
- `app/src/components/rooms/` (salas)
- `app/src/components/blocks/` (blocos)
- `app/src/components/rooms-admin/` (layout admin de salas)

---

## UI-006 — Formulário de usuário com seleção de permissões

**Status:** ✅ Concluído

**Arquivos:** `app/src/components/users/user-form-panel.tsx`, `user-form-dialog.tsx`

**O que foi implementado:**
- Seleção de **perfis** via `MultiSelect`
- Seleção de **tipos de sala** via `MultiSelect`
- Seleção de **salas diretas** via `MultiSelect` com deduplicação visual:
  - Salas já cobertas por um perfil selecionado → aparecem como `readonlyBadge` com tooltip `ProfileTooltipContent`
  - Salas já cobertas por um tipo de sala selecionado → aparecem como `readonlyBadge` com tooltip `RoomTypeTooltipContent`
- Impede concessão redundante de permissões ao usuário

---

## UI-007 — Formulário de perfil com seleção de permissões

**Status:** ✅ Concluído

**O que foi implementado:**
- Seleção de **tipos de sala** via `MultiSelect`
- Seleção de **salas diretas** via `MultiSelect` com deduplicação visual:
  - Salas já cobertas pelos tipos de sala selecionados → `readonlyBadge` com tooltip `RoomTypeTooltipContent`

---

## UI-008 — Componente `MultiSelect` avançado

**Status:** ✅ Concluído

**Arquivo:** `app/src/components/ui/multi-select.tsx` (ou similar)

**O que foi implementado:**
- Prop `readonlyBadges`: array de itens exibidos como badge sem botão de remoção (visualmente distintos dos itens selecionáveis)
- Tooltips com delay de 300ms ao passar sobre badges readonly
- Prop `tooltipContent`: componente React arbitrário renderizado no tooltip de cada badge
- Componentes de tooltip especializados:
  - `ProfileTooltipContent` — explica qual perfil já cobre aquela sala
  - `RoomTypeTooltipContent` — explica qual tipo de sala já cobre aquela sala

---

## UI-009 — Páginas de recuperação de senha

**Status:** ✅ Concluído

**Arquivos:**
- `app/src/routes/forgot-password.tsx`
- `app/src/routes/reset-password.tsx`

**O que foi implementado:**
- `/forgot-password` — formulário com campo de email; chama `POST /auth/forgot-password`
- `/reset-password` — formulário de nova senha; lê o token da query string da URL; chama `POST /auth/reset-password`
- Feedback inline de erro e sucesso (sem toast para erros visíveis no formulário)
- Redirecionamento para login após reset bem-sucedido

---

## UI-013 — Drawer de gestão de digitais (`FingerprintHandDrawer`)

**Status:** ✅ Concluído

**Arquivo:** `app/src/components/users/fingerprint-hand-drawer.tsx`

**O que foi implementado:**

### Visual e layout
- Drawer que abre de baixo (estilo "gaveta de sala")
- Handle com sombra interna no topo
- Fundo levemente diferente do resto da UI
- Borda superior espessa para delimitar o drawer

### Estrutura de conteúdo
- **Tabs** Mão Direita / Esquerda, cada uma mostrando a contagem de digitais cadastradas por mão
- **SVG interativo da mão** com `HotZoneOverlay`:
  - Botões acessíveis por teclado sobre cada dedo
  - Highlight **verde** (anel tracejado + dot) para dedos com digital cadastrada
  - Highlight **azul/primário** para o dedo atualmente selecionado
- **Painel de captura** com indicador de status do leitor (conectado/desconectado/modo teclado) e spinner animado no botão "Conectar"

### Fluxo de cadastro
1. Usuário seleciona um dedo no SVG
2. Clica em "Conectar Leitor" (modo teclado: sem diálogo de seleção)
3. Passa o dedo no leitor → template é capturado automaticamente
4. Hook `useFingerprintReader` dispara `registerFingerprint` na API
5. Query é invalidada → dedo passa a aparecer como "cadastrado" no SVG

### Lista de digitais cadastradas
- Uma linha por digital com: nome do dedo, data de cadastro, toggle ativo/inativo, botão de remoção
- Botão de remoção individual com `Loader2` enquanto `isDeletingId === fp.id` (loading state por item)
- `aria-label="Remover [nome do dedo]"` em cada botão de remoção

### Estados de carregamento
- Skeleton (`Loader2`) enquanto carrega as digitais existentes da API
- Spinner no botão "Conectar" durante `isConnecting`

---

## UI-014 — Badge de contagem de digitais na tabela de usuários

**Status:** ✅ Concluído

**Arquivo:** `app/src/components/users/users-table.tsx`

**O que foi implementado:**
- Coluna de ações exibe ícone `Fingerprint` roxo + badge numérico quando `fingerprintCount > 0`
- Badge é envolvido em `Tooltip` com texto: "N digital(is) cadastrada(s)"
- `fingerprintCount` vem do endpoint `GET /users` via subquery SQL no backend
- Ao fechar o `FingerprintHandDrawer`, `invalidateUsers()` é chamado para atualizar o badge sem reload

---

## Features de UI não iniciadas

| ID | Feature | Bloqueador |
|----|---------|-----------|
| UI-010 | Histórico de acessos | LOG-002 (endpoint backend) |
| UI-011 | CRUD de tipos de sala | ROOM-005 (backend) |
| UI-012 | Gestão de credenciais NFC por usuário | CRED-002 (backend) |
| UI-015 | Badges de perfis na tabela de usuários | — (pode ser feito) |
| UI-016 | Monitoramento em tempo real das salas | Polling ou WebSocket |
| UI-017 | Paginação nas tabelas de admin | — |
| UI-018 | Navbar sticky | — |

---

## Princípios de UX adotados

### Toast (Sonner)
Usado **apenas** quando o componente de contexto não está mais visível **e** não há alteração evidente no layout comunicando o resultado.

- ✅ Usar: erro em operação de background; confirmação após fechar modal
- ❌ Não usar: erro de login visível no formulário; login bem-sucedido (interface já muda)

### Visibilidade de informações sensíveis
- `currentUser` e `lastUser` nos cards de sala: **apenas para autenticados**
- Rotas `/users`, `/profiles`, `/rooms`: **apenas para admins** (guard no `beforeLoad`)
- `isAdmin` é verificado **server-side** — o guard no frontend é apenas UX

### Acessibilidade
- Todo botão customizado tem `aria-label` descritivo
- Regiões com mudança dinâmica de conteúdo usam `aria-live="polite"`
- Suporte completo a teclado (Tab + Enter/Space) em todos os elementos interativos
- Screen readers anunciados corretamente em `FingerprintCaptureFeedback` (5 estados)