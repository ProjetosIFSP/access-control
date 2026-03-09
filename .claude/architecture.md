# Arquitetura do Sistema — Controle de Acesso IoT (IFSP-PEP)

## Visão Geral

Sistema modular de controle de acesso e gerenciamento de salas, composto por quatro camadas principais que se comunicam via HTTP REST e MQTT.

```
┌─────────────────────────────────────────────────────────────────┐
│                     PORTAL WEB (app/)                           │
│          React 19 · Vite · TanStack Router/Query                │
│                  Tailwind CSS · shadcn/ui                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP REST (Orval / TanStack Query)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (server/)                        │
│           Fastify · Drizzle ORM · PostgreSQL                    │
│              better-auth · Zod · UUID v7                        │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ HTTP REST (undici)            │ PostgreSQL
           ▼                              ▼
┌───────────────────────┐     ┌──────────────────────────────────┐
│   BROKER MQTT (iot/)  │     │         BANCO DE DADOS           │
│  Node.js · Aedes      │     │           PostgreSQL             │
│  TCP :1883 · WS :9001 │     └──────────────────────────────────┘
└──────────┬────────────┘
           │ MQTT / TCP
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HARDWARE (core/)                            │
│     ESP32S · Sensor Biométrico ZN-53X · Leitor RFID RC522       │
│           Sensor SCT-013 · Reed Switch · Relé + Fechadura       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Camadas

### 1. Portal Web (`app/`)

Interface de administração e monitoramento. Construída com React 19 e TanStack Router (file-based routing). Todas as chamadas à API são gerenciadas pelo TanStack Query com código gerado automaticamente pelo Orval a partir do OpenAPI do servidor.

**Principais responsabilidades:**
- Autenticação de administradores (cookie de sessão via better-auth)
- CRUD de usuários, perfis, salas, blocos e tipos de sala
- Atribuição de permissões em múltiplos níveis
- Gestão de credenciais físicas (digitais biométricas, tags NFC)
- Visualização do estado das portas em tempo real
- Histórico de acessos com filtros

**Estrutura de diretórios relevante:**
```
app/src/
├── routes/          # Páginas (TanStack Router file-based)
├── components/      # Componentes por domínio (users/, rooms/, profiles/, ui/)
├── services/        # Funções de API client por domínio
├── hooks/           # Hooks customizados (ex: use-fingerprint-reader.ts)
├── lib/             # Utilitários e constantes (ex: biometrics.ts)
└── integrations/    # Configuração de clientes externos (TanStack Query)
```

**Tecnologias:**
| Lib | Uso |
|-----|-----|
| React 19 | UI declarativa |
| Vite | Build e dev server |
| TanStack Router | Roteamento type-safe file-based |
| TanStack Query | Cache, fetch e invalidação de dados |
| Tailwind CSS | Estilização utilitária |
| shadcn/ui | Componentes base (Radix UI) |
| Orval | Geração de código de API client a partir do OpenAPI |
| TypeScript | Tipagem estática |
| Biome | Linting e formatação |

---

### 2. Backend API (`server/`)

API REST construída com Fastify. Responsável por toda a lógica de negócio, autenticação, permissões e persistência. Expõe documentação Swagger em `/docs`.

**Principais responsabilidades:**
- Autenticação e gestão de sessões (better-auth)
- CRUD completo de entidades do domínio
- Sistema de permissões em 4 níveis
- Endpoints para o broker MQTT (registro de dispositivos, status, comandos, tentativas de acesso)
- Registro de log de acessos
- Gestão de credenciais físicas (fingerprint, NFC)

**Estrutura de diretórios relevante:**
```
server/src/
├── api/
│   ├── routes/      # Rotas Fastify por domínio
│   ├── server.ts    # Configuração e registro de plugins
│   ├── docs.ts      # Swagger/OpenAPI
│   └── openapi.ts   # Tipos auxiliares para schemas
├── db/
│   ├── schema/      # Schemas Drizzle ORM (tabelas, enums, relações)
│   ├── index.ts     # Instância do banco
│   └── seed.ts      # Seed de dados iniciais
├── services/        # Lógica de negócio por domínio
│   ├── iot/         # Controladores, comandos, acesso
│   ├── permissions/ # verify-access (4 níveis)
│   ├── profile/
│   ├── room/
│   └── user/
│       └── fingerprint/
├── lib/
│   ├── auth.ts      # Configuração better-auth
│   └── zod.ts       # Instância Zod com extensões
└── env.ts           # Validação de variáveis de ambiente
```

**Tecnologias:**
| Lib | Uso |
|-----|-----|
| Fastify | HTTP framework performático |
| fastify-type-provider-zod | Integração Zod com Fastify |
| Drizzle ORM | ORM type-safe para PostgreSQL |
| PostgreSQL | Banco de dados principal |
| better-auth | Autenticação com sessão por cookie |
| Zod | Validação de schemas |
| UUID v7 | IDs ordenáveis temporalmente |
| Pino | Logs estruturados |
| Biome | Linting e formatação |

---

### 3. Broker MQTT (`iot/`)

Broker MQTT baseado em Aedes (Node.js). Recebe mensagens dos controladores físicos (ESP32/ESP8266) e faz a ponte com o backend via HTTP.

**Principais responsabilidades:**
- Aceitar conexões MQTT TCP (porta 1883) e WebSocket (porta 9001)
- Rotear mensagens de dispositivos para o backend
- Gerenciar polling de comandos pendentes por controlador
- Publicar decisões de acesso de volta ao dispositivo

**Tópicos MQTT implementados:**

| Tópico | Direção | Descrição |
|--------|---------|-----------|
| `door/{id}/register` | Device → Broker | Registro inicial do controlador |
| `door/{id}/heartbeat` | Device → Broker | Keep-alive periódico |
| `door/{id}/status` | Device → Broker | Estado da porta e fechadura |
| `door/{id}/access-attempt` | Device → Broker | Credencial apresentada para acesso |
| `door/{id}/access-result` | Broker → Device | Decisão GRANTED/DENIED |
| `door/{id}/command` | Broker → Device | Comando (UNLOCK/LOCK/SYNC_STATE) |
| `door/{id}/command-result` | Device → Broker | ACK do comando executado |

**Tecnologias:**
| Lib | Uso |
|-----|-----|
| Aedes | Broker MQTT para Node.js |
| ws | WebSocket server |
| undici | HTTP client para chamar o backend |
| Pino | Logs estruturados |
| Zod | Validação de payloads MQTT |
| TypeScript | Tipagem estática |

---

### 4. Hardware / Firmware (`core/`)

Firmware para microcontroladores ESP32S (e futuramente ESP8266) que atuam como controladores de acesso instalados em cada porta.

**Principais responsabilidades:**
- Conectar ao Wi-Fi e ao broker MQTT
- Enviar heartbeat periódico
- Ler credenciais (biometria ZN-53X, RFID RC522)
- Detectar estado da porta (reed switch ou SCT-013)
- Controlar o relé da fechadura solenoide
- Executar comandos recebidos via MQTT

**Hardware utilizado:**
| Componente | Modelo | Função |
|------------|--------|--------|
| Microcontrolador | ESP32S | Processamento central |
| Sensor biométrico | ZN-53X / DY50 | Captura de digitais |
| Leitor RFID | RC522 | Leitura de cartões NFC |
| Sensor de corrente | SCT-013 | Detecção de estado da fechadura |
| Reed switch | Genérico | Detecção porta aberta/fechada |
| Relé | 5V 1 canal | Acionamento da fechadura |
| Fechadura | Solenoide 12V | Atuador eletromecânico |

**Fluxo de operação do dispositivo:**
```
Inicialização
    │
    ├─► Conectar Wi-Fi
    ├─► Conectar MQTT broker
    ├─► Publicar door/{id}/register
    │
    └─► Loop principal
            │
            ├─► [30s] Publicar door/{id}/heartbeat
            ├─► [500ms] Ler estado da porta → door/{id}/status
            ├─► [evento] Leitura biométrica/RFID
            │       └─► Publicar door/{id}/access-attempt
            │               └─► Aguardar door/{id}/access-result
            │                       ├─► GRANTED → acionar relé (UNLOCK)
            │                       └─► DENIED → feedback negativo
            └─► [evento] Receber door/{id}/command
                    └─► Executar (UNLOCK/LOCK/SYNC_STATE)
                            └─► Publicar door/{id}/command-result
```

---

## Modelo de Dados (simplificado)

```
user ──────────────────── account (better-auth)
 │                        session (better-auth)
 │
 ├── user_profile ──────── profile
 │                           │
 ├── user_room_permission    ├── profile_room_permission ──── room
 │                           │                                 │
 └── user_room_type_permission  profile_room_type_permission   │
                                                           room_type
                                                               │
                                                          block (bloco)

room ──── door_controller ──── door_command
                    │
                    └── access_log ──── access_credential (finger/NFC)
                                              │
                                          user
```

**Tabelas principais:**

| Tabela | Descrição |
|--------|-----------|
| `user` | Usuários do sistema |
| `profile` | Perfis de acesso agrupando permissões |
| `room` | Salas gerenciadas pelo sistema |
| `block` | Blocos/prédios que agrupam salas |
| `room_type` | Categorias de sala (laboratório, sala de aula, etc.) |
| `user_room_permission` | Permissão direta: usuário → sala |
| `user_room_type_permission` | Permissão: usuário → tipo de sala |
| `profile_room_permission` | Permissão: perfil → sala |
| `profile_room_type_permission` | Permissão: perfil → tipo de sala |
| `user_profile` | Vínculo usuário ↔ perfil |
| `door_controller` | Controlador físico vinculado a uma sala |
| `door_command` | Fila de comandos para controladores |
| `access_credential` | Credenciais físicas (FINGERPRINT / NFC_TAG) |
| `access_log` | Histórico de tentativas de acesso |

---

## Verificação de Acesso (fluxo IoT)

Quando um dispositivo publica `door/{id}/access-attempt` com uma credencial:

```
1. Broker recebe a mensagem
2. Broker chama POST /iot/access no backend
3. Backend executa processAccessAttempt(controllerId, credentialValue, credentialType)
    │
    ├── Busca o controlador → obtém roomId
    ├── Busca o usuário pela credencial (access_credential.value)
    └── Verifica acesso via verifyAccess(userId, roomId):
            ├── PERM-001: user_room_permission
            ├── PERM-002: user_room_type_permission
            ├── PERM-003: profile_room_permission (via user_profile)
            └── PERM-004: profile_room_type_permission (via user_profile)
4. Registra access_log (GRANTED ou DENIED + reason)
5. Resposta retorna ao broker
6. Broker publica door/{id}/access-result
    ├── GRANTED → Broker enfileira comando UNLOCK
    └── DENIED → Dispositivo exibe feedback negativo
```

> ⚠️ **Gap atual (PERM-005):** `processAccessAttempt` verifica apenas PERM-001.
> A integração com `verifyAccess` (que cobre os 4 níveis) ainda não foi feita.

---

## Infraestrutura

```
GitHub (repositório)
    │
    └─► GitHub Actions (CI/CD)
            │
            └─► Build Docker images
                    │
                    └─► Push para GHCR (GitHub Container Registry)
                                │
                                └─► Servidor de produção
                                        │
                                        └─► docker compose up -d
                                                ├─► server (Fastify :3000)
                                                ├─► iot (Aedes :1883/:9001)
                                                ├─► app (Nginx :80)
                                                └─► postgres (:5432)
```

**Arquivos Docker:**
| Arquivo | Uso |
|---------|-----|
| `docker-compose.yml` | Base compartilhada |
| `docker-compose.local.yml` | Override para desenvolvimento local |
| `docker-compose.prod.yml` | Override para produção |
| `deploy.sh` | Script de deploy automatizado |
| `app/Dockerfile` | Build do frontend |
| `server/Dockerfile` | Build do backend |
| `iot/Dockerfile.mqtt` | Build do broker MQTT |

---

## Comunicação entre Serviços

| De | Para | Protocolo | Porta |
|----|------|-----------|-------|
| Frontend (browser) | Backend API | HTTP REST | 3000 |
| Broker MQTT | Backend API | HTTP REST (undici) | 3000 |
| ESP32/ESP8266 | Broker MQTT | MQTT/TCP | 1883 |
| Frontend (futuro) | Broker MQTT | MQTT/WebSocket | 9001 |
| Backend | PostgreSQL | TCP | 5432 |

---

## Decisões de Design

### Por que MQTT e não WebSocket direto?
MQTT é o protocolo padrão para IoT. Oferece QoS, tópicos hierárquicos, retain e will messages. Dispositivos embarcados têm bibliotecas maduras (PubSubClient para Arduino). WebSocket seria overhead desnecessário no hardware.

### Por que o broker chama o backend via HTTP e não acessa o banco diretamente?
Separação de responsabilidades: o broker é stateless em relação ao negócio. Toda lógica de negócio (verificação de permissão, registro de log) fica no backend, que é o único a escrever no banco. Isso facilita escalar e testar cada serviço isoladamente.

### Por que Drizzle ORM e não Prisma?
Drizzle gera SQL explícito e oferece controle total sobre queries. Para um TCC com foco em performance e compreensão do sistema, ter o SQL visível é pedagogicamente melhor. Schemas como código TypeScript evitam a camada de abstração do Prisma schema.

### Por que better-auth e não implementação manual de JWT?
better-auth fornece sessões seguras por cookie HttpOnly (sem risco de XSS como no localStorage), fluxo de forgot/reset password, integração com Drizzle e tipagem TypeScript nativa — tudo que o projeto precisa sem reinventar segurança de autenticação.

### Por que UUID v7 nos IDs?
UUID v7 é ordenável temporalmente (prefixo de timestamp), o que melhora a performance de índices B-tree no PostgreSQL para inserções sequenciais, ao contrário do UUID v4 completamente aleatório.