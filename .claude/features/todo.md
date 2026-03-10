# Todo — Sistema de Controle de Acesso IoT

> Última atualização: migração de query params para nuqs (REFACTOR-002). Ver `implemented.md` → REFACTOR-002 para detalhes completos.

> Última atualização anterior: decisão arquitetural de biometria — WA26 descartado do fluxo de produção. Cadastro de digitais passa pelo terminal ZN-53X (HW-007). Ver `.claude/features/HARDWARE/hw-007-enrollment-terminal.md` e `.claude/test/enrollment-terminal/README.md`.

---

## ✅ Tasks concluídas (esta sessão)

### Migração de Query Params para nuqs — REFACTOR-002

- [x] `index.tsx` — removidos `validateSearch`, `loaderDeps`, `useDebounce`, `isMounted` ref e `useEffect` de sync; substituídos por `useQueryStates(indexSearchParams)` com `limitUrlUpdates: debounce(400)`
- [x] `users.tsx` — removidos `validateSearch`, `loaderDeps`, `useDebounce`, 2x `useRef` de guard (syncMounted/tabMounted) e 2x `useEffect` de sync; `selectedProfileId` agora é derivado do param; `setActiveTab` faz reset atômico via `setParams`
- [x] `rooms.tsx` — mesma abordagem; removidos `validateSearch`, `loaderDeps`, `useDebounce`, 2x `useRef`, 2x `useEffect`, import desnecessário de `usersQueryOptions`; `selectedTypeId`/`selectedBlockId` derivados dos arrays de params
- [x] Parsers declarativos tipados: `parseAsString`, `parseAsStringLiteral`, `parseAsArrayOf`, `parseAsInteger` com `.withDefault()` eliminam parsing manual
- [x] `clearOnDefault: true` — URLs limpas (ex: `page=1` não aparece na barra de endereço)
- [x] `shallow: false` — nuqs propaga mudanças ao TanStack Router corretamente
- [x] Zero erros TypeScript após refatoração (`tsc --noEmit` limpo)

---

## ✅ Tasks concluídas (sessões anteriores)

### Refatoração de Performance e Conformidade — REFACTOR-001

- [x] Criado `server/src/lib/require-admin.ts` — helper compartilhado com `resolveSession`, `requireAdmin` e `GuardReply`
- [x] Removidas ~120 linhas de código duplicado (`requireAdmin` local em `user.ts`, `profile.ts`, `room.ts`, `block.ts`)
- [x] `register-fingerprint.ts` — removido SELECT redundante antes do INSERT; banco usa constraint UNIQUE; adicionada `FingerprintDuplicateTemplateError` para template global duplicado
- [x] `list-fingerprints.ts` — `.orderBy(asc(...))` explícito
- [x] `fingerprint-hand-drawer.tsx` — `useQuery` passa a usar `userFingerprintsQueryOptions` centralizado
- [x] `fingerprint-hand-drawer.tsx` — dois `useEffect` de `reader.status` consolidados em um único
- [x] `fingerprint-hand-drawer.tsx` — toast de sucesso removido (violava guideline UX: SVG da mão já mostra o resultado visualmente)
- [x] `verify-access.ts` — corrigido gap de segurança: credencial `isActive=false` agora é rejeitada; projeções explícitas (`select*` → campos específicos); `.limit(1)` adicionado
- [x] `useIsMobile.hook.ts` renomeado para `use-is-mobile.ts` (kebab-case + named export + `ReturnType<typeof setTimeout>`)
- [x] Todos os 110 testes Vitest passando após as mudanças

---

## ✅ Tasks concluídas (sessões anteriores — histórico)

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

- [ ] **ARCH-001** — Decisão arquitetural de biometria: WA26 descartado do fluxo de produção
  - O CS9711 embutido no notebook não é HID; o WA26 usa protocolo Boland incompatível com ZN-53X
  - Templates de sensores diferentes são incompatíveis — impossível matching cruzado
  - **Decisão:** terminal físico dedicado ESP32 + ZN-53X para enrollment
  - Templates extraídos via UploadTemplate (0x08) e sincronizados para todos os controladores via MQTT
  - Matching on-device em cada ZN-53X — sem matching centralizado no backend
  - Documentado em `.claude/features/HARDWARE/hw-007-enrollment-terminal.md`

---

## 🔜 Próxima tarefa recomendada

### 1. HW-007 (Passo 1) — Validar compatibilidade física do ZN-53X

**Por quê agora?** É o pré-requisito de toda a arquitetura biométrica. Se o ZN-53X não responder ao protocolo R30x da biblioteca Adafruit, o fluxo de enrollment não funciona e a decisão arquitetural precisa ser revisada.

**O que fazer:**
1. Montar o circuito: ESP32S + ZN-53X/A21 via UART2 (GPIO16/17)
2. Carregar o firmware em `.claude/test/enrollment-terminal/firmware-enrollment-test.ino`
3. Verificar no Serial Monitor se `verifyPassword()` retorna `FINGERPRINT_OK`
4. Registrar o baudrate que funcionou e os primeiros bytes do template
5. Preencher a tabela de validações no `README.md` do teste

**Arquivos envolvidos:**
- `.claude/test/enrollment-terminal/firmware-enrollment-test.ino` (firmware de teste)
- `.claude/test/enrollment-terminal/README.md` (guia de execução)

---

### 2. PERM-005 — Unificar verificação de acesso no fluxo IoT

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

### 3. HW-007 (Passos 2–6) — Validar fluxo completo de enrollment

**Depende de:** HW-007 Passo 1 concluído com sucesso

**O que fazer:**
1. Passo 2: captura de 2 passagens e `createModel()`
2. Passo 3: extração de 256 bytes via `getModel()` (UploadTemplate)
3. Passo 4: transmissão do template ao backend via MQTT (`enrollment/{id}/result`)
4. Passo 5: download do template de volta para o ZN-53X (`storeModel`)
5. Passo 6: matching local com `fingerFastSearch()` após sincronização

**Novos componentes de backend necessários (implementar durante este passo):**
- Endpoint `POST /iot/enrollment/complete` — recebe resultado do terminal e persiste credencial
- Endpoint `GET /iot/enrollment/:id/status` — polling do portal
- Tópico MQTT `enrollment/{terminalId}/start` no broker (novo handler)
- Tópico MQTT `enrollment/{terminalId}/result` no broker (novo handler)
- Tópico MQTT `door/{controllerId}/sync-credentials` (novo — distribui templates)
- Tópico MQTT `door/{controllerId}/sync-result` (novo — confirma carga)
- Migração: tabela `enrollment_request` no banco
- Migração: tabela `controller_credential_slot` no banco

**Arquivos envolvidos:**
- `.claude/test/enrollment-terminal/firmware-enrollment-test.ino`
- `iot/src/index.ts` (novos handlers MQTT)
- `server/src/api/routes/` (novos endpoints)
- `server/src/db/schema/` (novas tabelas)

---

### 4. LOG-002 — Endpoint de histórico de acessos

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

### 5. UI-010 — Página de histórico de acessos

**Depende de:** LOG-002

**O que fazer:**
1. Criar rota `/access-logs` no TanStack Router
2. Tabela filtrável: por sala, usuário, status e período
3. Colunas: usuário, sala, status (badge colorido), tipo de credencial, data/hora
4. Paginação (ou scroll infinito)
5. Exportar CSV (opcional para TCC)

---

### 6. HW-001 — Modularizar firmware base no `core/`

**Por quê?** O firmware de teste está documentado mas não no projeto. Necessário para a monografia.

**O que fazer:**
1. Inicializar projeto PlatformIO em `core/`
2. Criar estrutura modular: `main.cpp`, `config.h`, `mqtt_handler`, `wifi_manager`, `lock_controller`
3. Portar código de teste (`.claude/test/hardware-porta/`) para estrutura modular
4. Adicionar suporte a OTA updates e watchdog timer
5. Testar contra o broker com o ESP32S físico

---

### 7. CRED-002 — Endpoints de cadastro de NFC_TAG por usuário

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
- [ ] HW-007 — Terminal de enrollment biométrico ZN-53X (pré-requisito de HW-002)
  - Passo 1: compatibilidade R30x — **fazer primeiro**
  - Passos 2–6: fluxo completo de enrollment + sync MQTT
- [ ] HW-002 — Integração com sensor biométrico ZN-53X nos controladores de acesso
  - Depende de HW-007 para definição do formato de template e protocolo de sync
  - Fluxo: recebe `sync-credentials` → `storeModel()` → `fingerFastSearch()` → resolve credentialId → `access-attempt`
- [ ] HW-003 — Integração com leitor RFID RC522 no firmware
- [ ] HW-004 — Controle do relé da fechadura solenoide (após aquisição do hardware)
- [ ] HW-005 — Reed switch real (substituir simulação por botão)
- [ ] HW-006 — Protocolo de reconexão e fallback offline no firmware

### Backend — novos (desbloqueados por HW-007)
- [ ] Migração: tabela `enrollment_request` (rastreia enrollments em andamento)
- [ ] Migração: tabela `controller_credential_slot` (mapeia slotId → credentialId por controlador)
- [ ] Endpoint `POST /iot/enrollment/complete` (persiste template e dispara sync)
- [ ] Endpoint `GET /iot/enrollment/:id/status` (polling do portal)
- [ ] Endpoint `DELETE /users/:id/fingerprints/:credentialId` — estender para disparar `delete-credential` MQTT

### IoT / Broker MQTT — novos (desbloqueados por HW-007)
- [ ] Handler `enrollment/{terminalId}/start` (publica comando ao terminal)
- [ ] Handler `enrollment/{terminalId}/result` (recebe template, chama backend)
- [ ] Handler `door/{controllerId}/sync-credentials` (distribui templates aos controladores)
- [ ] Handler `door/{controllerId}/sync-result` (confirma slots carregados)
- [ ] Handler `door/{controllerId}/delete-credential` (remove template de slot)

### Hardware pendente de aquisição
- [ ] Fechadura solenoide 12V
- [ ] Módulo relé 5V (1 canal)
- [ ] Fonte 12V / 2A
- [ ] Sensor reed switch + ímã
- [ ] LEDs RGB e buzzer para feedback ao usuário

### Infraestrutura
- [ ] INFRA-004 — Monitoramento de logs em produção (Loki + Grafana ou similar)

### Testes físicos pendentes
- [ ] **[PRIORITÁRIO]** Validar compatibilidade ZN-53X com protocolo R30x — ver `.claude/test/enrollment-terminal/README.md` Passo 1
- [ ] Executar Passos 2–6 do guia de enrollment e preencher tabela de validações
- [ ] WA26: identificar `vendorId`/`productId` reais (somente para demonstração do hook — não entra no fluxo de produção)
- [ ] Testar rejeição de template duplicado (409 Conflict) com terminal de enrollment real