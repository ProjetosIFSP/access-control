# HW-008 — Offline-First nas Fechaduras (N Últimas Credenciais)

## Informações Gerais

| Campo | Valor |
|---|---|
| **ID** | HW-008 |
| **Módulo** | HARDWARE |
| **Status** | ⬜ Não iniciado |
| **Prioridade** | 🟡 Média — melhora resiliência sem bloquear o fluxo principal |
| **Depende de** | HW-007 (fluxo de enrollment e sync de credenciais definido) |
| **Bloqueia** | Nada — pode ser implementado em paralelo com HW-002 |

---

## Descrição

Define a política de operação das fechaduras (controladores ESP32 + ZN-53X) quando a conexão com o broker MQTT / backend está indisponível.

O matching biométrico já é **on-device por natureza** — o ZN-53X executa `fingerFastSearch()` localmente, sem depender da rede para comparar a digital. O que depende da rede é a **verificação de permissão** (o backend decide GRANTED/DENIED após receber o `access-attempt`).

Esta feature formaliza como o controlador se comporta quando:
1. Não consegue publicar `door/{id}/access-attempt` (sem MQTT)
2. O ZN-53X está com capacidade de slots esgotada (máx. 162 para R30x)

---

## Problema Central — Capacidade vs. Resiliência

### Capacidade do ZN-53X

O chip R30x suporta até **162 templates** na memória interna (slots 0–161). O IFSP-PEP pode ter mais de 162 usuários com credencial biométrica registrada, o que significa que **nem todos os templates podem estar no sensor simultaneamente**.

### Cenário de falha de rede

Sem conexão MQTT:
- O matching local ainda funciona (o ZN-53X encontra o template se ele estiver no slot)
- Mas o controlador não consegue enviar `access-attempt` ao backend
- Logo, **não há verificação de permissão e nenhuma decisão de GRANTED/DENIED**

A política offline-first define o que fazer nesse intervalo.

---

## Política Definida — Offline-First com N Últimas Credenciais

### Premissa de design

> Manter nas fechaduras apenas as **N credenciais mais recentemente usadas** (ou mais recentemente sincronizadas). Se a rede cair, conceder acesso local apenas para essas N credenciais, sem verificação de permissão no backend.

### Justificativa

- **Segurança aceitável para o TCC:** o template que está no sensor pertence a um usuário que já foi autenticado pelo sistema ao menos uma vez recentemente. A probabilidade de acesso indevido é baixa no contexto de um campus universitário.
- **Praticidade:** usuários que acessam a sala frequentemente têm seus templates na memória local — exatamente quem mais precisaria de acesso durante uma falha de rede.
- **Sem complexidade de sincronização offline:** o controlador não tenta enfileirar tentativas de acesso para enviar depois (o que criaria problemas de replay e consistência de log).

### Comportamento por camada

#### Camada 1 — Verificação local (sempre primeiro)

```
Usuário apresenta dedo
→ ZN-53X executa fingerFastSearch()
→ [ENCONTROU template no slot]
    └── controlador tenta publicar door/{id}/access-attempt no MQTT
        ├── [MQTT disponível] → aguarda door/{id}/access-result (timeout: 3s)
        │       ├── GRANTED → aciona relé, log local
        │       └── DENIED  → feedback negativo, log local
        └── [MQTT indisponível ou timeout] → modo offline
                └── concede acesso localmente (LED verde + relé)
                    e registra tentativa em log local (flash/EEPROM)
→ [NÃO encontrou] → nega acesso imediatamente (LED vermelho)
   mesmo com MQTT disponível, não tenta verificação remota
   (se não está no sensor, não está no sistema deste controlador)
```

#### Camada 2 — Política de slots (quando capacidade é excedida)

Quando o backend envia `sync-credentials` com uma nova credencial e todos os 162 slots estão ocupados:

```
Backend seleciona slot a ser substituído:
  → slot com credencial de uso mais antigo (lastUsedAt mais velho)
  → se empate: slot com credencial sincronizada há mais tempo (syncedAt mais velho)

Backend publica door/{id}/sync-credentials com:
  payload: {
    credentials: [...],
    evict: [{ slotId: X, credentialId: "uuid-antigo" }]  ← slot a liberar
  }

Controlador:
  → executa deleteModel(slotId X) — remove template do ZN-53X
  → executa storeModel(slotId X, novoTemplate) — carrega novo template
  → atualiza mapeamento local: slotId → credentialId
  → publica door/{id}/sync-result confirmando slots carregados e evicted
```

O backend atualiza `controller_credential_slot` removendo a linha evicted e inserindo a nova.

---

## Campos de Banco Necessários

### Tabela `controller_credential_slot` — campos adicionais

Além dos campos já definidos no HW-007:

```sql
ALTER TABLE controller_credential_slot
  ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE;
  -- Atualizado pelo backend quando access-attempt bem-sucedido usa esta credencial.
  -- NULL se a credencial nunca foi usada neste controlador.
```

O `lastUsedAt` é atualizado pelo backend a cada `access-attempt` com `status = GRANTED` que resolva para aquele `credentialId` + `controllerId`.

### Tabela `access_log_local` (opcional — apenas se log offline for implementado)

```sql
-- Tentativas de acesso ocorridas durante ausência de rede.
-- Enviadas ao backend quando a conexão for restabelecida.
CREATE TABLE access_log_local (
  -- Armazenada na flash/EEPROM do ESP32, não no PostgreSQL.
  -- Estrutura apenas para referência de documentação:
  timestamp     INTEGER,        -- Unix timestamp (segundos)
  credential_id TEXT,           -- UUID da credencial resolvida localmente
  slot_id       SMALLINT,       -- slot do ZN-53X que matched
  granted       BOOLEAN,        -- sempre true neste contexto (offline grants)
  synced        BOOLEAN         -- false até ser enviada ao backend
);
```

> **Nota de implementação:** o log offline é armazenado na memória não-volátil do ESP32 (Preferences / LittleFS), não no PostgreSQL. Ao reconectar, o controlador publica `door/{id}/offline-log` com as tentativas acumuladas. O backend registra no `access_log` com flag `was_offline: true` no campo `reason`.

---

## Novos Tópicos MQTT

| Tópico | Direção | Descrição |
|---|---|---|
| `door/{id}/offline-log` | Device → Broker | Tentativas de acesso ocorridas offline, enviadas ao reconectar |
| `door/{id}/sync-credentials` | Broker → Device | Já existia — agora inclui campo opcional `evict` com slots a liberar |
| `door/{id}/credential-used` | Device → Broker | Notifica qual credencial foi usada com sucesso (para atualizar `lastUsedAt`) |

---

## Novos Endpoints REST

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/iot/offline-log` | Recebe log de acessos offline e persiste no `access_log` com flag |
| `PATCH` | `/iot/devices/:id/credential-used` | Atualiza `last_used_at` de um `controller_credential_slot` |

---

## Comportamento de Eviction — Detalhamento

### Quem decide o evict?

O **backend** decide qual slot será evictado, não o controlador. Isso centraliza a lógica de negócio e permite que o backend considere:

1. `last_used_at` do slot (principal critério — evicta o menos usado recentemente)
2. `synced_at` do slot (desempate — evicta o sincronizado há mais tempo)
3. Se a credencial a evictar ainda está ativa (`access_credential.isActive`) — dar preferência a evictar credenciais desativadas

### Limite N configurável

O limite N não precisa ser 162 (capacidade máxima do chip). O admin pode configurar um limite menor por controlador para garantir que sempre haverá slots livres para emergências:

```
Configuração sugerida para o TCC:
  N = 140 (reserva 22 slots livres para credenciais urgentes)
```

Isso não está implementado ainda — para o TCC, usar o limite físico do chip (162) é suficiente.

### Diagrama de eviction

```
Banco: controller_credential_slot para controlador X
┌─────┬──────────────┬─────────────────────────┬─────────────────────────┐
│ slot│ credential   │ synced_at               │ last_used_at            │
├─────┼──────────────┼─────────────────────────┼─────────────────────────┤
│  0  │ cred-alice   │ 2025-01-10 08:00        │ 2025-06-01 14:30  ← recente │
│  1  │ cred-bob     │ 2025-01-10 08:00        │ 2025-02-01 09:00  ← antigo  │
│  2  │ cred-carol   │ 2025-03-01 10:00        │ NULL              ← nunca   │
│ ... │ ...          │ ...                     │ ...                     │
│ 161 │ cred-zara    │ 2025-05-01 12:00        │ 2025-05-20 11:00        │
└─────┴──────────────┴─────────────────────────┴─────────────────────────┘

Nova credencial chega → todos os slots ocupados
→ Evict: slot 2 (cred-carol, last_used_at = NULL — nunca usada)
   desempate com slot 1 (last_used_at mais antigo vence se não houver NULL)
→ Slot 2 liberado → novo template carregado
```

---

## Critérios de Aceite

- [ ] **CA-01** — Quando MQTT está disponível, o controlador sempre tenta `access-attempt` antes de conceder acesso (fluxo online normal)
- [ ] **CA-02** — Quando MQTT está indisponível (ou timeout de 3s), o controlador concede acesso localmente se o template foi encontrado no ZN-53X
- [ ] **CA-03** — O acesso offline é registrado no log local (flash/EEPROM) com timestamp e credentialId
- [ ] **CA-04** — Ao reconectar ao broker, o controlador publica `door/{id}/offline-log` com as tentativas acumuladas
- [ ] **CA-05** — Backend persiste as tentativas offline no `access_log` com `reason` indicando `WAS_OFFLINE`
- [ ] **CA-06** — Quando todos os 162 slots estão ocupados, o backend inclui `evict` no payload de `sync-credentials`
- [ ] **CA-07** — O controlador executa `deleteModel(evictSlotId)` antes de `storeModel()` ao receber um slot para evictar
- [ ] **CA-08** — O backend atualiza `controller_credential_slot` removendo o slot evictado e inserindo o novo após receber `sync-result`
- [ ] **CA-09** — O `last_used_at` de um slot é atualizado no banco a cada acesso GRANTED que usar aquela credencial naquele controlador
- [ ] **CA-10** — O critério de eviction prioriza: (1) credenciais com `last_used_at = NULL`, (2) `last_used_at` mais antigo, (3) `synced_at` mais antigo

---

## Viabilidade Técnica

### Memória do ESP32 para log offline

O ESP32 tem 4MB de flash. Usando LittleFS ou o sistema de Preferences:
- Cada entrada de log offline ocupa ~50 bytes (timestamp + UUID + slot + flags)
- 1.000 entradas = ~50KB — perfeitamente viável
- Em cenários reais, quedas de rede raramente geram mais de algumas dezenas de tentativas

### Timeout de MQTT

O timeout de 3 segundos para aguardar `access-result` é um parâmetro de firmware. Deve ser ajustável via `config.h`. Em redes lentas, aumentar para 5s. Em redes locais confiáveis, 2s é suficiente.

### Consistência de `lastUsedAt` com acesso offline

Se o acesso ocorreu offline, o backend não sabe imediatamente que aquela credencial foi usada. O `last_used_at` só é atualizado quando o log offline é sincronizado. Isso é aceitável — a janela de inconsistência é a duração da falha de rede, que tipicamente é de minutos.

### Risco de acesso indevido no modo offline

O maior risco é: um usuário tem sua permissão revogada no portal, mas o template ainda está no sensor de uma fechadura (ainda não houve sync de deleção). Se a rede cair antes do `delete-credential` chegar, o usuário pode abrir a porta no modo offline.

**Mitigação para o TCC:** documentar este risco na monografia. Em produção, a mitigação seria TLS no MQTT (para garantir entrega do delete-credential) e um tempo máximo de operação offline configurável (ex: após 30 minutos sem heartbeat, travar a porta).

---

## Dependências e Bloqueios

### Depende de
- **HW-007** — formato de template, tabela `controller_credential_slot` e fluxo de sync definidos
- **HW-002** — firmware de integração biométrica nas fechaduras (matching on-device)

### Não bloqueia
- Pode ser implementado como evolução do firmware após HW-002 funcional

---

## Notas de Implementação

### Ordem recomendada de implementação

1. Implementar o timeout de MQTT e concessão offline (CA-01 e CA-02) — mais simples, alto impacto
2. Implementar log offline em LittleFS + sincronização ao reconectar (CA-03 a CA-05)
3. Implementar política de eviction com `evict` no payload de sync (CA-06 a CA-10)

### Referência de código para timeout MQTT no firmware

```cpp
// Em access_handler.cpp (firmware do controlador de porta)
const unsigned long MQTT_ACCESS_TIMEOUT_MS = 3000;

void onFingerprintMatch(uint16_t slotId, String credentialId) {
  unsigned long deadline = millis() + MQTT_ACCESS_TIMEOUT_MS;
  bool mqttOk = mqttClient.publish(
    ("door/" + CONTROLLER_ID + "/access-attempt").c_str(),
    buildAccessAttemptPayload(credentialId).c_str()
  );

  if (!mqttOk) {
    // MQTT publish falhou — modo offline imediato
    grantOffline(credentialId, slotId);
    return;
  }

  // Aguarda access-result com timeout
  while (millis() < deadline) {
    mqttClient.loop();
    if (accessResultReceived) {
      handleAccessResult(accessResultGranted);
      return;
    }
    delay(10);
  }

  // Timeout — concede offline
  grantOffline(credentialId, slotId);
}

void grantOffline(String credentialId, uint16_t slotId) {
  activateRelay();
  setLedGreen();
  appendOfflineLog(credentialId, slotId, millis());
}
```

### Referência para log offline com Preferences (ESP32)

```cpp
#include <Preferences.h>
Preferences prefs;

void appendOfflineLog(String credentialId, uint16_t slotId, unsigned long ts) {
  prefs.begin("offline_log", false);
  int count = prefs.getInt("count", 0);
  String key = "entry_" + String(count);
  String entry = String(ts) + "," + credentialId + "," + String(slotId);
  prefs.putString(key.c_str(), entry.c_str());
  prefs.putInt("count", count + 1);
  prefs.end();
}

void flushOfflineLog() {
  prefs.begin("offline_log", true);
  int count = prefs.getInt("count", 0);
  if (count == 0) { prefs.end(); return; }

  // Monta JSON com todas as entradas e publica em MQTT
  String payload = buildOfflineLogPayload(count);
  bool ok = mqttClient.publish(
    ("door/" + CONTROLLER_ID + "/offline-log").c_str(),
    payload.c_str()
  );

  if (ok) {
    prefs.end();
    // Limpa o log após envio confirmado
    prefs.begin("offline_log", false);
    prefs.clear();
    prefs.end();
  }
}
```

### Quando chamar `flushOfflineLog()`

Chamar logo após reconectar ao broker MQTT (no callback de conexão bem-sucedida), antes de publicar o heartbeat. Isso garante que o backend receba os logs offline antes de qualquer novo evento.