# 🚀 Deploy

Este guia detalha o processo para implantar a aplicação `access-control` em um servidor de produção.

O projeto utiliza Docker para conterizar os serviços e GitHub Actions para automação de CI (Continuous Integration), construindo e publicando as imagens no GitHub Container Registry (GHCR).

## Rodando apenas o banco de dados localmente

1. Crie seu arquivo `.env` a partir do `.env.example`
2. Inicie o contêiner do banco de dados:

```
docker-compose -f docker-compose.local.yml up -d
```

O PostgreSQL ficará acessível em `localhost:5432`. A aplicação backend rodando localmente poderá se conectar a ele para executar migrações e outras operações.

---

## 1. Pré-requisitos do Servidor

- Docker
- Docker Compose

---

## 2. Configuração Inicial do Servidor

### Passo 1: Preparar o diretório

```
mkdir ~/access-control && cd ~/access-control
```

### Passo 2: Obter os arquivos de deploy

Copie os seguintes arquivos para o diretório criado:

- `docker-compose.prod.yml`
- `deploy.sh`
- `.env` com as variáveis sensíveis dos serviços
- `iot/.env` (opcional) para sobrescrever variáveis padrão do broker MQTT

### Passo 3: Criar o arquivo de variáveis de ambiente

**Arquivo `.env` (raiz do deploy):**

```
POSTGRES_USER=user_db
POSTGRES_PASSWORD=uma_senha_muito_segura_aqui
POSTGRES_DB=access-control
```

**Arquivo `iot/.env` (opcional):**

```
API_BASE_URL=http://server:3333
MQTT_PORT=1883
MQTT_WS_PORT=9001
COMMAND_POLL_INTERVAL=1000
LOG_LEVEL=info
```

### Passo 4: Criar o GitHub Personal Access Token (PAT)

1. Acesse a [página de tokens do GitHub](https://github.com/settings/tokens)
2. Clique em "Generate new token" (classic)
3. Dê um nome ao token (ex: `access-control-deploy`)
4. Selecione a permissão `read:packages`
5. Clique em "Generate token" e copie o valor gerado

---

## 3. Processo de Deploy (ou Atualização)

### Passo 1: Push para a branch `main`

```
git push origin main
```

Aguarde a finalização bem-sucedida dos workflows do GitHub Actions.

### Passo 2: Executar o script de deploy no servidor

```bash
chmod +x deploy.sh   # apenas na primeira vez
export GHCR_PAT="seu_token_copiado_do_github"
./deploy.sh
```

---

## 4. Serviços

| Serviço  | Descrição                                      | Porta(s)      | Dependências         |
|----------|------------------------------------------------|---------------|----------------------|
| `server` | API REST (Fastify + Drizzle ORM)               | `3333`        | PostgreSQL           |
| `web`    | Interface React / Vite (TanStack Router)       | `3000`        | `server`             |
| `iot`    | Broker MQTT (Aedes) + integração com a API     | `1883`, `9001`| `server`             |
| `db`     | PostgreSQL com volume persistente              | `5432`        | —                    |

### Verificando os logs

```bash
# Todos os serviços
docker-compose -f docker-compose.prod.yml logs -f

# Serviço específico
docker-compose -f docker-compose.prod.yml logs -f server
```

---

## 5. Arquitetura Geral

```
┌─────────────┐        MQTT/WebSocket        ┌─────────────────┐
│  ESP32 /    │ ◄──────────────────────────► │   Broker MQTT   │
│ Controlador │                              │  (Aedes / iot)  │
└─────────────┘                              └────────┬────────┘
                                                      │ HTTP (REST)
                                                      ▼
┌─────────────┐        HTTP (REST)           ┌─────────────────┐
│  Interface  │ ◄──────────────────────────► │   API REST      │
│  Web (SPA)  │                              │  (Fastify)      │
└─────────────┘                              └────────┬────────┘
                                                      │ SQL (Drizzle)
                                                      ▼
                                             ┌─────────────────┐
                                             │   PostgreSQL    │
                                             └─────────────────┘
```

### Fluxo de acesso físico

1. O controlador ESP32 publica uma tentativa de acesso no tópico `door/{id}/access-attempt` via MQTT.
2. O broker IoT encaminha para `POST /iot/devices/{id}/access-attempts` na API REST.
3. A API verifica a credencial, consulta permissões (direta / por tipo / por perfil) e registra o log.
4. A decisão (`GRANTED` / `DENIED`) é publicada de volta no tópico `door/{id}/access-result`.
5. Se concedido, a API enfileira um comando `UNLOCK` e o broker entrega ao controlador via polling.

---

## 6. Estado atual do projeto

### Backend (`server/`)

**Tecnologias:** Fastify · Drizzle ORM · PostgreSQL · Zod · better-auth · UUID v7

**Banco de dados — tabelas implementadas:**

| Tabela                      | Finalidade                                                          |
|-----------------------------|---------------------------------------------------------------------|
| `block`                     | Agrupamento físico de salas (ex: Bloco A)                          |
| `room`                      | Sala com estado da porta, requisitos de biometria/RFID e tipo      |
| `room_type`                 | Tipo de sala (ex: Laboratório, Sala de Aula)                       |
| `door_controller`           | Dispositivo ESP32 vinculado a uma sala                             |
| `door_command`              | Fila de comandos para o controlador (UNLOCK, LOCK, SYNC_STATE)     |
| `access_credential`         | Credencial física do usuário (digital ou tag NFC)                  |
| `user_room_permission`      | Permissão direta de usuário para uma sala específica               |
| `user_room_type_permission` | Permissão de usuário para todas as salas de um tipo                |
| `access_log`                | Histórico de tentativas de acesso (GRANTED / DENIED)               |
| `profile`                   | Perfil de acesso que agrupa permissões                             |
| `user_profile`              | Associação N:N entre usuário e perfil                              |
| `profile_room_permission`   | Permissão de perfil para uma sala específica                       |
| `profile_room_type_permission` | Permissão de perfil para todas as salas de um tipo              |
| `user` / `session` / ...    | Tabelas gerenciadas pelo better-auth                               |

**Rotas implementadas:**

| Prefixo         | Operações disponíveis                                                                 |
|-----------------|---------------------------------------------------------------------------------------|
| `/auth/*`       | Login, logout e callback (better-auth)                                               |
| `/users`        | CRUD completo + `/me` + `/:id/relations` (perfis, salas, tipos)                     |
| `/profiles`     | CRUD completo + `/:id/relations` + atribuição avulsa de usuário e sala              |
| `/rooms`        | CRUD completo + `/:id/relations` + sincronização de perfis e usuários               |
| `/room-types`   | Listagem                                                                             |
| `/blocks`       | CRUD completo                                                                        |
| `/doors`        | Listagem de controladores                                                            |
| `/iot/devices`  | Registro, heartbeat, status, tentativa de acesso, fila de comandos e ACK            |
| `/access/verify`| Verificação de permissão multimodal (biometria ou RFID)                             |

**Lógica de verificação de acesso (`verifyAccess`):**
Verifica nesta ordem: permissão direta de sala → permissão por tipo de sala → permissão via perfil (sala) → permissão via perfil (tipo de sala).

**Lógica de processamento IoT (`processAccessAttempt`):**
Valida controlador, atualiza `lastSeenAt`, valida credencial, verifica se está ativa, verifica permissão direta do usuário e registra o log de acesso.

> ⚠️ **Gap:** `processAccessAttempt` ainda não consulta permissões por tipo de sala nem por perfil — usa apenas `userRoomPermission`. A lógica completa está em `verifyAccess` mas os dois serviços não foram unificados.

---

### IoT (`iot/`)

**Tecnologias:** Node.js · Aedes (broker MQTT) · WebSocket · Pino · Zod · undici

**Tópicos MQTT tratados:**

| Tópico                          | Direção          | Ação                                              |
|---------------------------------|------------------|---------------------------------------------------|
| `door/{id}/register`            | Dispositivo → API| Registra o controlador e inicia polling           |
| `door/{id}/heartbeat`           | Dispositivo → API| Atualiza `lastSeenAt`                             |
| `door/{id}/status`              | Dispositivo → API| Atualiza `doorState` e `isLocked` da sala         |
| `door/{id}/access-attempt`      | Dispositivo → API| Avalia credencial e publica decisão               |
| `door/{id}/access-result`       | API → Dispositivo| Decisão de acesso (GRANTED / DENIED)              |
| `door/{id}/command`             | API → Dispositivo| Entrega de comando (UNLOCK, LOCK, SYNC_STATE)     |
| `door/{id}/command-result`      | Dispositivo → API| ACK do comando executado pelo controlador         |

**Polling de comandos:** a cada `COMMAND_POLL_INTERVAL` ms por controlador ativo; comandos expirados são marcados como `EXPIRED` antes da entrega.

---

### Frontend (`app/`)

**Tecnologias:** React 19 · Vite · TanStack Router · TanStack Query · TailwindCSS · shadcn/ui · Zod · Sonner

**Rotas implementadas:**

| Rota              | Acesso      | Descrição                                                          |
|-------------------|-------------|--------------------------------------------------------------------|
| `/`               | Público     | Painel de salas agrupadas por bloco com filtros (busca, tipo, estado) |
| `/users`          | Admin       | CRUD de usuários com painel lateral (split-view)                  |
| `/profiles`       | Admin       | CRUD de perfis com painel lateral (split-view)                    |
| `/rooms`          | Admin       | CRUD de salas e blocos com abas e painel lateral                  |
| `/forgot-password`| Público     | Solicitação de redefinição de senha                               |
| `/reset-password` | Público     | Redefinição de senha via token                                    |

**Componentes de destaque:**

- `MultiSelect` — seletor múltiplo com busca, badges selecionáveis (com "x"), `readonlyBadges` (sem "x") e suporte a `tooltip` em ambos os tipos de badge com `delayDuration={300}`.
- `SplitView` — layout de lista + painel lateral responsivo.
- `RoomCard` — card de sala com indicador de estado colorido, usuário atual/último e timestamp relativo.
- `UserFormPanel` / `ProfileFormPanel` — formulários com seleção de permissões (perfis, tipos de sala, salas diretas) com deduplicação visual e tooltips contextuais.
- `permission-tooltip-contents.tsx` — componentes compartilhados `ProfileTooltipContent` e `RoomTypeTooltipContent` usados nos tooltips dos badges de permissão.

**Gerenciamento de estado:**
- TanStack Query com `staleTime` configurado por entidade (2–5 min)
- Invalidação granular por entidade e por relação após mutações
- Pré-carregamento de dados no `loader` da rota (antes de renderizar)