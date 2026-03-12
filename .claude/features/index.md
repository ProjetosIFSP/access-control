# Índice de Features — Sistema de Controle de Acesso IoT (IFSP-PEP)

> Atualizado após sessão de implementação de biometria (CREDENCIAL-001 parcial) e testes de hardware (HW-ESP32S).

---

## Legenda

| Símbolo | Status |
|---------|--------|
| ✅ | Concluído |
| 🔧 | Parcial / Com gap |
| ⬜ | Não iniciado |

---

## Backend (`server/`)

| ID        | Feature                                               | Status | Observações                                                                 |
|-----------|-------------------------------------------------------|--------|-----------------------------------------------------------------------------|
| AUTH-001  | Autenticação via cookie (better-auth)                 | ✅     | Login, logout, sessão, `/me`                                                |
| AUTH-002  | Redefinição de senha (forgot/reset)                   | ✅     | Fluxo completo com token                                                    |
| USER-001  | CRUD de usuários                                      | ✅     | Criar, listar, atualizar, excluir                                           |
| USER-002  | Relações do usuário (perfis, salas, tipos)            | ✅     | `GET /users/:id/relations`                                                  |
| ROOM-001  | CRUD de blocos                                        | ✅     | Criar, listar, atualizar, excluir                                           |
| ROOM-002  | CRUD de salas                                         | ✅     | Criar, listar, atualizar, excluir                                           |
| ROOM-003  | Relações da sala (perfis, usuários)                   | ✅     | `GET /rooms/:id/relations`                                                  |
| ROOM-004  | Listagem de tipos de sala                             | ✅     | `GET /room-types`                                                           |
| ROOM-005  | CRUD completo de tipos de sala                        | ⬜     | Apenas listagem implementada; faltam criar, atualizar, excluir              |
| PROF-001  | CRUD de perfis de acesso                              | ✅     | Criar, listar, atualizar, excluir                                           |
| PROF-002  | Relações do perfil (usuários, salas, tipos)           | ✅     | `GET /profiles/:id/relations`                                               |
| PERM-001  | Permissão direta usuário → sala                       | ✅     | `user_room_permission`                                                      |
| PERM-002  | Permissão usuário → tipo de sala                      | ✅     | `user_room_type_permission`                                                 |
| PERM-003  | Permissão perfil → sala                               | ✅     | `profile_room_permission`                                                   |
| PERM-004  | Permissão perfil → tipo de sala                       | ✅     | `profile_room_type_permission`                                              |
| PERM-005  | Verificação de acesso unificada no fluxo IoT          | 🔧     | `processAccessAttempt` só verifica PERM-001; PERM-002/003/004 ignorados     |
| CRED-001  | Gestão de credenciais físicas — digitais (FINGERPRINT)| 🔧     | Endpoints REST prontos; fluxo real via terminal ZN-53X (HW-007); WA26 descartado; `enrolledByControllerId` adicionado ao schema para rastreio de dispositivo de captura |
| CRED-002  | Gestão de credenciais físicas — RFID (NFC_TAG)        | ⬜     | Tabela existe, sem endpoints de cadastro NFC                                |
| LOG-001   | Registro de log de acessos (GRANTED / DENIED)         | ✅     | Tabela `access_log` populada pelo fluxo IoT                                 |
| LOG-002   | Endpoint de consulta de histórico de acessos          | ⬜     | Sem rota `GET /access-logs`; bloqueia UI-010                                |
| DOOR-001  | Registro e heartbeat de controladores                 | ✅     | `PUT /iot/devices/:id` e `PATCH .../heartbeat`; payload aceita `sensorProtocol` e `sensorModel`; `roomId` NOT NULL (sem terminais dedicados) |
| DOOR-002  | Atualização de status de porta                        | ✅     | `PUT /iot/devices/:id/status`                                               |
| DOOR-003  | Fila de comandos (UNLOCK, LOCK, SYNC_STATE)           | ✅     | Criar, pull, ACK com expiração automática                                   |

---

## IoT / Broker MQTT (`iot/`)

| ID       | Feature                                               | Status | Observações                                                              |
|----------|-------------------------------------------------------|--------|--------------------------------------------------------------------------|
| MQTT-001 | Broker MQTT TCP (Aedes) — porta 1883                  | ✅     | Funcional                                                                |
| MQTT-002 | Broker MQTT WebSocket — porta 9001                    | ✅     | Funcional                                                                |
| MQTT-003 | Tópico `door/{id}/register`                           | ✅     | Registra controlador (com `sensorProtocol`/`sensorModel`) e inicia polling de comandos |
| MQTT-004 | Tópico `door/{id}/heartbeat`                          | ✅     | Atualiza `lastSeenAt`                                                    |
| MQTT-005 | Tópico `door/{id}/status`                             | ✅     | Atualiza `doorState` e `isLocked`                                        |
| MQTT-006 | Tópico `door/{id}/access-attempt`                     | 🔧     | Processa credencial mas ignora permissões por tipo/perfil (PERM-005)     |
| MQTT-007 | Tópico `door/{id}/access-result`                      | ✅     | Publica decisão GRANTED/DENIED de volta ao dispositivo                   |
| MQTT-008 | Tópico `door/{id}/command`                            | ✅     | Entrega UNLOCK/LOCK/SYNC_STATE ao controlador                            |
| MQTT-009 | Tópico `door/{id}/command-result`                     | ✅     | Recebe ACK do controlador                                                |
| MQTT-010 | Polling de comandos pendentes por controlador         | ✅     | Intervalo configurável, expiração automática                             |
| MQTT-011 | Enfileiramento automático de UNLOCK após acesso       | ✅     | Disparado após decisão GRANTED                                           |

---

## Frontend (`app/`)

| ID     | Feature                                                         | Status | Observações                                                               |
|--------|-----------------------------------------------------------------|--------|---------------------------------------------------------------------------|
| UI-001 | Página pública `/` — listagem de salas por bloco                | ✅     | Filtros por busca, tipo e estado                                          |
| UI-002 | Cards de sala com estado, usuário atual/último e timestamp      | ✅     | Visibilidade condicional por autenticação                                 |
| UI-003 | Página `/users` — CRUD de usuários (admin)                      | ✅     | Split-view, busca, pré-carregamento                                       |
| UI-004 | Página `/profiles` — CRUD de perfis (admin)                     | ✅     | Split-view, busca                                                         |
| UI-005 | Página `/rooms` — CRUD de salas e blocos (admin)                | ✅     | Split-view com abas Salas/Blocos/Tipos                                    |
| UI-006 | Formulário de usuário com seleção de permissões                 | ✅     | Perfis, tipos de sala, salas diretas com deduplicação visual              |
| UI-007 | Formulário de perfil com seleção de permissões                  | ✅     | Tipos de sala e salas diretas com badges readonly                         |
| UI-008 | `MultiSelect` com `readonlyBadges` e tooltips (delay 300ms)     | ✅     | `ProfileTooltipContent`, `RoomTypeTooltipContent`                         |
| UI-009 | Páginas `/forgot-password` e `/reset-password`                  | ✅     | Fluxo completo                                                            |
| UI-010 | Página de histórico de acessos                                  | ⬜     | Aguarda LOG-002 no backend                                                |
| UI-011 | CRUD de tipos de sala na interface admin                        | ⬜     | Aguarda ROOM-005 no backend                                               |
| UI-012 | Gestão de credenciais NFC por usuário                           | ⬜     | Aguarda CRED-002 no backend                                               |
| UI-013 | Drawer de gestão de digitais por usuário                        | ✅     | `FingerprintHandDrawer` com SVG interativo, tabs mão D/E, auto-registro   |
| UI-014 | Badge de contagem de digitais na tabela de usuários             | ✅     | Ícone Fingerprint roxo + tooltip; atualiza ao fechar drawer               |
| UI-015 | Badges de perfis na tabela de listagem de usuários              | ⬜     | Não implementado                                                          |
| UI-016 | Monitoramento em tempo real do estado das salas                 | ⬜     | Polling curto ou WebSocket                                                |
| UI-017 | Paginação nas tabelas de admin                                  | ⬜     | Usuários, salas, logs                                                     |
| UI-018 | Navbar sticky                                                   | ⬜     | Não implementado                                                          |
| UI-019 | Seletor de fechadura no drawer de digitais (`FingerprintHandDrawer`) | ⬜ | Botão "Cadastrar via Fechadura" com dropdown de fechaduras online; spinner com countdown do TTL; polling de `GET /iot/enrollment/:id/status`; substitui aba "Terminais" removida |
| UI-020 | Migração para TanStack Start (SSR + Vinxi)                          | ✅ | `app/` recriado do zero; `vite.config.ts` com `tanstackStart()`; `__root.tsx` com `<html>/<head>/<body>`, `HeadContent`, `Scripts`; `router.tsx` com `QueryClient` no context; `start.ts` como entry SSR |
| UI-021 | Documentação integrada com FumaDocs                                 | ✅ | `source.config.ts`, `content/docs/index.mdx`; rota wildcard `/docs/$`; API de busca `/api/search`; `RootProvider` do fumadocs-ui/provider/tanstack; CSS do fumadocs integrado no `app.css` |

---

## Hardware / Firmware (`core/`)

| ID     | Feature                                             | Status | Observações                                                                  |
|--------|-----------------------------------------------------|--------|------------------------------------------------------------------------------|
| HW-001 | Firmware base ESP32S (Wi-Fi + MQTT + heartbeat)     | 🔧     | Código de teste funcional em `.claude/test/hardware-porta/`; não modularizado |
| HW-002 | Integração com sensor biométrico (DY50 / ZN-53X)   | ⬜     | Depende de HW-007 para definição do formato de template; matching on-device  |
| HW-003 | Integração com leitor RFID RC522                    | ⬜     | Hardware possuído; sem implementação                                         |
| HW-004 | Controle do relé da fechadura solenoide             | ⬜     | Hardware ainda não adquirido                                                 |
| HW-005 | Detecção de estado da porta (reed switch / SCT-013) | 🔧     | SCT-013 testado no firmware de teste; reed switch como botão simulado        |
| HW-006 | Protocolo de reconexão e fallback offline           | ⬜     | Não implementado                                                             |
| HW-007 | Modo terminal de enrollment nas próprias fechaduras (ZN-53X + ESP32) | ⬜ | Toda fechadura alterna entre modo fechadura (padrão) e modo terminal via MQTT; sem dispositivo dedicado; `sensorProtocol`, `sensorModel` e `enrolledByControllerId` no schema; `role` removido do `door_controller`; `roomId` NOT NULL |
| HW-007-ALT | Análise de viabilidade: HLK-ZW111 (Hi-Link) como alternativa ao ZN-53X | 📋 Análise | Protocolo UART proprietário Hi-Link; vantagem de low power nativo (FINGER_DET IRQ); risco crítico: exportação/importação de template raw não confirmada; recomendação: manter ZN-53X por ora. Ver `.claude/features/HARDWARE/hw-007-alt-hlk-zw111.md` |
| HW-008 | Offline-first nas fechaduras (N últimas credenciais)| ⬜     | Política definida em `.claude/features/HARDWARE/hw-008-offline-first.md`; matching local sempre primeiro; eviction por `lastUsedAt`; log offline via LittleFS |

---

## Infraestrutura

| ID       | Feature                                         | Status | Observações                                                       |
|----------|-------------------------------------------------|--------|-------------------------------------------------------------------|
| INFRA-001| Docker Compose (local e produção)               | ✅     | `docker-compose.local.yml` e `docker-compose.prod.yml`           |
| INFRA-002| CI/CD via GitHub Actions + GHCR                 | ✅     | Build e publicação de imagens em push para `main`                |
| INFRA-003| Script de deploy automatizado (`deploy.sh`)     | ✅     | Pull de imagens + restart dos serviços                           |
| INFRA-004| Monitoramento de logs em produção               | ⬜     | Sem stack de observabilidade configurada (Loki/Grafana)          |

---

## Próximas prioridades

1. **PERM-005 / MQTT-006** — Unificar verificação de acesso no `processAccessAttempt` com `verifyAccess`
2. **Schema** — Reverter `role` e `roomId nullable` do `door_controller`; gerar migration com campos corretos (`sensorProtocol`, `sensorModel`, `enrolledByControllerId`); criar tabelas `enrollment_request` e `controller_credential_slot`
3. **HW-007** — Validar compatibilidade ZN-53X + fluxo de enrollment em modo terminal (guia em `.claude/test/enrollment-terminal/`)
4. **LOG-002** — Endpoint `GET /access-logs` com filtros (sala, usuário, período, status)
5. **UI-010** — Página de histórico de acessos (depende de LOG-002)
6. **HW-001** — Modularizar firmware base ESP32S em `core/` (PlatformIO)
7. **CRED-002** — Endpoints de cadastro de NFC_TAG por usuário
8. **UI-016** — Monitoramento em tempo real (WebSocket ou polling curto no frontend)
9. **UI-019** — Seletor de fechadura no drawer de digitais (após endpoints de enrollment no backend)
10. **HW-008** — Offline-first: timeout MQTT + concessão local + log offline (após HW-002 funcional)