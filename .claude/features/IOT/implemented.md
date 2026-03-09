# IOT — Implementações Realizadas

## MQTT-001 / MQTT-002 — Broker MQTT TCP e WebSocket

**Status:** ✅ Concluído

**Arquivo principal:** `iot/src/index.ts`

---

### Tecnologias

| Lib | Versão | Uso |
|-----|--------|-----|
| Aedes | latest | Broker MQTT para Node.js |
| ws | latest | WebSocket server (porta 9001) |
| undici | latest | HTTP client para chamar o backend (fetch nativo Node.js) |
| Pino | latest | Logs estruturados |
| Zod | latest | Validação de payloads MQTT |

---

### Servidores ativos

| Protocolo | Porta | Clientes |
|-----------|-------|---------|
| MQTT/TCP | 1883 | ESP32/ESP8266 (firmware) |
| MQTT/WebSocket | 9001 | Debug / futuro monitoramento frontend |

---

## MQTT-003 — Tópico `door/{id}/register`

**Status:** ✅ Concluído

**O que faz:** Ao receber a mensagem de registro, o broker chama `PUT /iot/devices/:id` no backend, que cria ou atualiza o `door_controller` com o `roomId` e `firmwareVersion` informados. Em seguida, inicia o polling de comandos pendentes para aquele controlador.

**Payload esperado do dispositivo:**
```json
{
  "roomId": "uuid-da-sala",
  "firmwareVersion": "0.1.0"
}
```

---

## MQTT-004 — Tópico `door/{id}/heartbeat`

**Status:** ✅ Concluído

**O que faz:** Chama `PATCH /iot/devices/:id/heartbeat` no backend, que atualiza `lastSeenAt` do controlador para o timestamp atual.

**Payload esperado:**
```json
{
  "firmwareVersion": "0.1.0"
}
```

---

## MQTT-005 — Tópico `door/{id}/status`

**Status:** ✅ Concluído

**O que faz:** Chama `PUT /iot/devices/:id/status` no backend, que atualiza `doorState` (OPEN/CLOSED) e `isLocked` (boolean) do controlador.

**Payload esperado:**
```json
{
  "doorState": "OPEN",
  "isLocked": false
}
```

---

## MQTT-006 — Tópico `door/{id}/access-attempt`

**Status:** 🔧 Parcial — processa credencial mas ignora permissões por tipo/perfil (ver PERM-005)

**O que faz:** Chama `POST /iot/access` no backend com a credencial apresentada. O backend busca o usuário pela credencial, verifica permissão (atualmente só PERM-001) e retorna `GRANTED` ou `DENIED`.

**Payload esperado:**
```json
{
  "credentialType": "NFC_TAG",
  "credentialValue": "A1B2C3D4"
}
```

**Gap:** `processAccessAttempt` no backend verifica apenas `user_room_permission` (PERM-001). Usuários com acesso via perfil ou tipo de sala são incorretamente rejeitados.

---

## MQTT-007 — Tópico `door/{id}/access-result`

**Status:** ✅ Concluído

**O que faz:** Após processar a tentativa de acesso, o broker publica a decisão de volta ao dispositivo neste tópico.

**Payload publicado pelo broker:**
```json
{
  "status": "GRANTED",
  "reason": "Permissão direta encontrada"
}
```
ou
```json
{
  "status": "DENIED",
  "reason": "Usuário não encontrado"
}
```

---

## MQTT-008 — Tópico `door/{id}/command`

**Status:** ✅ Concluído

**O que faz:** Parte do sistema de polling. O broker, ao identificar comandos pendentes para um controlador, publica o próximo comando neste tópico.

**Payload publicado pelo broker:**
```json
{
  "commandId": "uuid-do-comando",
  "type": "UNLOCK"
}
```

**Tipos de comando suportados:** `UNLOCK`, `LOCK`, `SYNC_STATE`

---

## MQTT-009 — Tópico `door/{id}/command-result`

**Status:** ✅ Concluído

**O que faz:** Recebe o ACK do dispositivo após executar um comando. Chama `PATCH /iot/commands/:id` no backend para atualizar o status do comando para `EXECUTED` ou `REJECTED`.

**Payload esperado do dispositivo:**
```json
{
  "commandId": "uuid-do-comando",
  "status": "COMPLETED"
}
```

---

## MQTT-010 — Polling de comandos pendentes

**Status:** ✅ Concluído

**O que faz:** Ao registrar um controlador, o broker inicia um intervalo periódico que chama `GET /iot/devices/:id/commands/pending` no backend. Se houver comandos pendentes, publica o próximo via `door/{id}/command`.

**Características:**
- Intervalo configurável via variável de ambiente
- Publica apenas 1 comando por vez (aguarda ACK antes do próximo)
- Comandos com `expiresAt` no passado são automaticamente ignorados pelo backend (status `EXPIRED`)
- Intervalo é limpo quando o cliente se desconecta

---

## MQTT-011 — Enfileiramento automático de UNLOCK após acesso GRANTED

**Status:** ✅ Concluído

**O que faz:** Imediatamente após a decisão `GRANTED` para uma tentativa de acesso, o broker cria automaticamente um comando `UNLOCK` para o controlador via `POST /iot/devices/:id/commands`. O polling então entrega esse comando ao dispositivo.

**Fluxo completo:**
```
access-attempt recebido
    │
    └─► POST /iot/access (backend)
            │
            └─► GRANTED
                    │
                    ├─► Publicar door/{id}/access-result (GRANTED)
                    └─► POST /iot/devices/{id}/commands { type: "UNLOCK" }
                                │
                                └─► Polling entrega o UNLOCK ao dispositivo
```

---

## Estado geral do broker

### Tratamento de erros

- Erros no processamento de mensagens MQTT são capturados e logados com Pino — nunca propagados para derrubar o processo
- Falhas nas chamadas HTTP ao backend são logadas com o status code e corpo da resposta
- Payloads inválidos (falha no parse JSON ou validação Zod) são descartados com log de aviso

### Logs estruturados (Pino)

Todos os eventos relevantes são logados com campos estruturados:
- `controllerId` — ID do controlador envolvido
- `topic` — tópico MQTT recebido/publicado
- `action` — ação executada (register, heartbeat, status, etc.)
- `err` — objeto de erro quando aplicável

### Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `BACKEND_URL` | URL base da API backend | `http://localhost:3333` |
| `MQTT_TCP_PORT` | Porta TCP do broker | `1883` |
| `MQTT_WS_PORT` | Porta WebSocket do broker | `9001` |
| `COMMAND_POLL_INTERVAL_MS` | Intervalo de polling de comandos (ms) | `3000` |

---

## Gaps e próximas melhorias

- [ ] **MQTT-006 / PERM-005** — Integrar `verifyAccess` no `processAccessAttempt` do backend (4 níveis de permissão)
- [ ] Autenticação de clientes MQTT (validar `clientId` contra o banco ao conectar)
- [ ] Reconexão automática com retry ao backend quando a API estiver indisponível
- [ ] Endpoint de health check (`GET /health`) no broker
- [ ] Monitoramento: lista de clientes conectados e métricas de mensagens