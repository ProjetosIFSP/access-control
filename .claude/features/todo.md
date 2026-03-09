# Todo — Sistema de Controle de Acesso IoT

---

## ✅ Tasks concluídas (sessões anteriores)

### Biometria — CREDENCIAL-001 (frontend + backend)
- [x] `TASK 01+02` — Tipos, constantes e hot-zones de biometria (`app/src/lib/biometrics.ts`)
- [x] `TASK 01` — `HotZoneOverlay` no SVG de mão com acessibilidade e easter egg Halloween
- [x] `TASK 03` — Hook `useFingerprintReader` (modo `keyboard` e `hid`) com countdown 30s
- [x] `TASK 04` — Serviço de API client para digitais (`services/users/fingerprints.ts`)
- [x] `TASK 05` — Endpoints REST no servidor: `GET/POST/DELETE/PATCH /users/:id/fingerprints`
- [x] `TASK 06` — Migração de banco: enum `finger_key` + coluna `finger` em `access_credential`
- [x] `TASK 07` — Serviços de fingerprint no servidor (`list`, `register`, `delete`, `toggle`)
- [x] `TASK 08` — Componente `FingerprintHandDrawer` (drawer, tabs mão D/E, SVG interativo)
- [x] `TASK 09` — Componente `FingerprintCaptureFeedback` (5 estados animados + aria-live)
- [x] `TASK 10` — Item "Gerenciar Digitais" no menu de ações da tabela de usuários
- [x] `TASK 11` — `fingerprintCount` no `UserSummary` (backend + frontend + badge com tooltip)
- [x] `TASK 12` — Invalidação de query ao fechar `FingerprintHandDrawer`
- [x] `TASK 13/14` — Polish: acessibilidade, mensagens de erro, loading states, bug Halloween

### Teste de hardware — ESP32S
- [x] Firmware de teste com MQTT, SCT-013 e botão (simulando reed switch) documentado em `.claude/test/hardware-porta/`
- [x] Protocolo de tópicos MQTT mapeado e validado contra o broker

---

## 🚨 Bugs / Gaps críticos

- [ ] **PERM-005** — `processAccessAttempt` ignora permissões por tipo de sala e por perfil
  - Localização: `server/src/services/iot/access.ts`
  - Correção: substituir verificação manual por chamada a `verifyAccess` em `server/src/services/permissions/verify-access.ts`
  - Impacto: usuários com acesso via perfil ou tipo de sala **não conseguem abrir a porta fisicamente**
  - Bloqueado por: nada — pode ser feito imediatamente

---

## 🔜 Próxima tarefa recomendada

### 1. PERM-005 — Unificar verificação de acesso no fluxo IoT

**Por quê agora?** É um gap de segurança/funcionalidade crítico. O sistema responde "DENIED" a usuários legítimos que têm acesso via perfil ou tipo de sala.

**O que fazer:**
1. Abrir `server/src/services/iot/access.ts` → função `processAccessAttempt`
2. Localizar a verificação de permissão atual (apenas `user_room_permission`)
3. Substituir pela chamada a `verifyAccess(userId, roomId)` que já verifica os 4 níveis
4. Garantir que o log de acesso continua sendo criado com o motivo correto
5. Testar com usuário que tem acesso apenas via perfil

**Arquivos envolvidos:**
- `server/src/services/iot/access.ts` (modificar)
- `server/src/services/permissions/verify-access.ts` (reutilizar)

---

### 2. LOG-002 — Endpoint de histórico de acessos

**Por quê?** Bloqueia UI-010 (página de histórico) e é essencial para auditoria do TCC.

**O que fazer:**
1. Criar rota `GET /access-logs` em `server/src/api/routes/` (ou no arquivo existente de iot/logs)
2. Suportar filtros: `roomId`, `userId`, `status` (GRANTED/DENIED), `from`, `to`, `limit`, `offset`
3. Retornar: `id`, `userId`, `userName`, `roomId`, `roomName`, `status`, `reason`, `credentialType`, `createdAt`
4. Proteger com `requireAdmin`
5. Documentar no Swagger

**Arquivos envolvidos:**
- `server/src/api/routes/` (novo arquivo ou adicionar em rota existente)
- `server/src/db/schema/access.ts` (schema já existe)

---

### 3. UI-010 — Página de histórico de acessos

**Depende de:** LOG-002

**O que fazer:**
1. Criar rota `/access-logs` no TanStack Router
2. Tabela filtrável: por sala, usuário, status e período
3. Colunas: usuário, sala, status (badge colorido), tipo de credencial, data/hora
4. Paginação (ou scroll infinito)
5. Exportar CSV (opcional para TCC)

---

### 4. HW-001 — Modularizar firmware base no `core/`

**Por quê?** O firmware de teste está documentado mas não no projeto. Necessário para a monografia.

**O que fazer:**
1. Inicializar projeto PlatformIO em `core/`
2. Criar estrutura modular: `main.cpp`, `config.h`, `mqtt_handler`, `wifi_manager`, `lock_controller`
3. Portar código de teste (`.claude/test/hardware-porta/`) para estrutura modular
4. Adicionar suporte a OTA updates e watchdog timer
5. Testar contra o broker com o ESP32S físico

---

### 5. CRED-002 — Endpoints de cadastro de NFC_TAG por usuário

**Por quê?** Necessário para o fluxo completo de credenciais RFID.

**O que fazer:**
1. Reutilizar estrutura dos endpoints de fingerprint em `user.ts`
2. Criar endpoints: `GET/POST/DELETE/PATCH /users/:id/nfc-tags`
3. Campo `value` = UID do cartão (string hex, ex: `"A1B2C3D4"`)
4. Validar unicidade global do UID
5. Adicionar UI de cadastro de NFC (UI-012) após isso

---

## 📋 Pendências gerais (backlog)

### Backend
- [ ] ROOM-005 — CRUD completo de tipos de sala (criar, atualizar, excluir)
- [ ] Paginação nas listagens de usuários e logs
- [ ] Rate limiting nas rotas de autenticação

### Frontend
- [ ] UI-011 — CRUD de tipos de sala na interface admin (depende de ROOM-005)
- [ ] UI-012 — Gestão de credenciais NFC por usuário (depende de CRED-002)
- [ ] UI-015 — Badges de perfis na tabela de listagem de usuários
- [ ] UI-016 — Monitoramento em tempo real do estado das salas (WebSocket ou polling curto)
- [ ] UI-017 — Paginação nas tabelas de admin
- [ ] UI-018 — Navbar sticky

### Hardware / Firmware
- [ ] HW-002 — Integração com sensor biométrico DY50 / ZN-53X no firmware
- [ ] HW-003 — Integração com leitor RFID RC522 no firmware
- [ ] HW-004 — Controle do relé da fechadura solenoide (após aquisição do hardware)
- [ ] HW-005 — Reed switch real (substituir simulação por botão)
- [ ] HW-006 — Protocolo de reconexão e fallback offline no firmware

### Hardware pendente de aquisição
- [ ] Fechadura solenoide 12V
- [ ] Módulo relé 5V (1 canal)
- [ ] Fonte 12V / 2A
- [ ] Sensor reed switch + ímã
- [ ] LEDs RGB e buzzer para feedback ao usuário

### Infraestrutura
- [ ] INFRA-004 — Monitoramento de logs em produção (Loki + Grafana ou similar)

### Testes físicos pendentes
- [ ] Identificar `vendorId` e `productId` reais do leitor WA26 (conectar e rodar script do guia)
- [ ] Preencher `KNOWN_FINGERPRINT_FILTERS` em `app/src/hooks/use-fingerprint-reader.ts`
- [ ] Validar formato do template emitido pelo WA26 (hex ISO 19794-2 vs string de teclado)
- [ ] Testar rejeição de template duplicado (409 Conflict) com leitor real