# HW-007 — Terminal de Enrollment Biométrico (ZN-53X + ESP32)

## Informações Gerais

| Campo | Valor |
|---|---|
| **ID** | HW-007 |
| **Módulo** | HARDWARE |
| **Status** | ⬜ Não iniciado |
| **Prioridade** | 🔴 Alta — desbloqueia o fluxo biométrico completo |
| **Depende de** | HW-001 (firmware base modularizado), MQTT-001 |
| **Bloqueia** | HW-002 (integração biométrica nos controladores de acesso), CRED-001 (fluxo completo) |

---

## Descrição

Implementação de um terminal físico dedicado exclusivamente ao **cadastro (enrollment) de impressões digitais**, composto por um ESP32 + sensor ZN-53X conectados via UART.

O terminal não controla nenhuma fechadura — sua única responsabilidade é capturar o template biométrico do dedo do usuário, extraí-lo do sensor via UART e transmiti-lo ao backend via MQTT. O backend armazena o template e dispara a sincronização para todos os controladores de acesso registrados no sistema.

### Por que um terminal dedicado?

O sistema possui N controladores de acesso (um por porta), cada um com seu próprio ZN-53X. Para que um único cadastro valha para todas as portas, o template gerado no enrollment precisa ser:

1. **Capturado** por um sensor ZN-53X (mesmo fabricante/algoritmo dos sensores nas portas)
2. **Extraído** como blob binário de 256 bytes via comando UART `UploadTemplate` (0x08)
3. **Armazenado** no backend (campo `access_credential.value`)
4. **Distribuído** para todos os controladores via tópico MQTT de sincronização
5. **Carregado** em cada ZN-53X das portas via comando UART `DownloadTemplate` (0x09) / `StoreModel` (0x06)

Isso elimina o problema de interoperabilidade entre sensores de fabricantes diferentes (ex.: WA26 vs ZN-53X), pois o template é sempre gerado e validado pelo mesmo chip.

---

## Funcionamento — Fluxo Completo

### Fase 1: Iniciação pelo admin (portal web)

```
Admin abre portal → navega até usuário X → aba Digitais
→ clica no dedo desejado → botão "Cadastrar via Terminal"
→ portal chama POST /users/:id/fingerprints/enroll-request
→ backend cria registro de enrollment pendente com token
→ backend publica MQTT: enrollment/{terminalId}/start
   payload: { enrollmentId, userId, finger, expiresAt }
→ portal exibe spinner aguardando confirmação
```

### Fase 2: Captura física no terminal

```
ESP32 recebe MQTT enrollment/{id}/start
→ acende LED azul (aguardando dedo)
→ chama getImage() → image2Tz(slot=1) — 1ª captura
→ acende LED roxo (pede 2ª passagem)
→ chama getImage() → image2Tz(slot=2) — 2ª captura
→ chama createModel() — combina as duas capturas em um template
→ chama getModel() (UploadTemplate 0x08) — extrai 256 bytes do template via UART
→ converte bytes para string hex (512 chars)
→ publica MQTT: enrollment/{id}/result
   payload: { enrollmentId, userId, finger, template: "hex...", quality: 85 }
→ acende LED verde (sucesso) ou vermelho (falha)
```

### Fase 3: Persistência e sincronização (backend)

```
Broker recebe enrollment/{id}/result
→ chama POST /iot/enrollment/complete no backend
→ backend valida enrollmentId + userId + finger
→ backend insere access_credential { userId, type: FINGERPRINT, finger, value: template }
→ backend dispara sync para todos os controladores ativos:
   para cada door_controller do sistema:
     publica MQTT: door/{controllerId}/sync-credentials
     payload: { credentials: [{ credentialId, userId, template, finger }] }
→ backend responde ao portal (WebSocket ou polling) com sucesso
→ portal exibe confirmação
```

### Fase 4: Recepção nos controladores de acesso

```
Cada ESP32 de porta recebe door/{id}/sync-credentials
→ para cada credencial recebida:
   carrega template no ZN-53X via DownloadTemplate (0x09) em slot livre
   registra mapeamento: slotId → credentialId → userId
→ publica door/{id}/sync-result com lista de slots carregados
→ backend atualiza controller_credential_slot com slotId e syncedAt
```

### Validação (fluxo normal de acesso)

```
Usuário apresenta dedo na porta
→ ZN-53X executa fingerFastSearch() — matching local contra templates armazenados
→ retorna: slotId + confidence (ou NOTFOUND)
→ ESP32 resolve slotId → credentialId → userId via mapeamento local
→ publica door/{id}/access-attempt
   payload: { credentialType: FINGERPRINT, credentialValue: credentialId }
→ backend verifica permissão → GRANTED / DENIED
→ ESP32 aciona relé ou exibe feedback negativo
```

---

## Diferença em relação ao fluxo atual de FINGERPRINT

| Aspecto | Fluxo atual (WA26) | Fluxo com terminal ZN-53X |
|---|---|---|
| Captura | WA26 emula teclado no PC | ZN-53X via UART no ESP32 |
| Template | String proprietária Boland | Blob 256 bytes protocolo R30x |
| Compatibilidade | Incompatível com ZN-53X das portas | Mesmo chip — 100% compatível |
| Matching | Backend (comparação exata `=`) | On-device (ZN-53X) |
| `credentialValue` enviado no acesso | Template bruto | `credentialId` (UUID) |
| Validade para N portas | ❌ Não funciona | ✅ Sim, via sync MQTT |
| Cadastro único para todas as portas | ❌ | ✅ |

---

## Novos Tópicos MQTT

| Tópico | Direção | Descrição |
|---|---|---|
| `enrollment/{terminalId}/start` | Broker → Terminal | Inicia captura para userId + finger |
| `enrollment/{terminalId}/result` | Terminal → Broker | Template capturado (hex) + qualidade |
| `enrollment/{terminalId}/cancel` | Broker → Terminal | Cancela captura em andamento |
| `door/{controllerId}/sync-credentials` | Broker → Controlador | Envia lista de templates para carregar |
| `door/{controllerId}/sync-result` | Controlador → Broker | Confirma slots carregados |
| `door/{controllerId}/delete-credential` | Broker → Controlador | Remove template de um slot |

---

## Novos Endpoints REST

| Método | Path | Descrição |
|---|---|---|
| `POST` | `/users/:id/fingerprints/enroll-request` | Inicia enrollment — retorna `enrollmentId` e publica MQTT |
| `POST` | `/iot/enrollment/complete` | Chamado pelo broker ao receber `enrollment/result` — persiste template e dispara sync |
| `GET` | `/iot/enrollment/:id/status` | Polling do portal para saber se enrollment foi concluído |
| `DELETE` | `/users/:id/fingerprints/:credentialId` | Já existe — agora também dispara `delete-credential` MQTT para todos os controladores |

---

## Novo Schema de Banco

### Tabela `controller_credential_slot`

Mapeia qual slot do ZN-53X de cada controlador corresponde a qual credencial:

```sql
CREATE TABLE controller_credential_slot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_id   UUID NOT NULL REFERENCES door_controller(id) ON DELETE CASCADE,
  credential_id   UUID NOT NULL REFERENCES access_credential(id) ON DELETE CASCADE,
  slot_id         SMALLINT NOT NULL,  -- posição no ZN-53X (0–162)
  synced_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (controller_id, slot_id),
  UNIQUE (controller_id, credential_id)
);
```

### Tabela `enrollment_request`

Rastreia enrollments em andamento (TTL curto, ~5 minutos):

```sql
CREATE TABLE enrollment_request (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  finger        finger_key NOT NULL,
  terminal_id   TEXT NOT NULL,         -- controllerId do terminal de enrollment
  status        TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | COMPLETED | FAILED | EXPIRED
  expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Mudança em `access_credential`

O campo `value` para credenciais `FINGERPRINT` passa a armazenar o blob de 256 bytes em hex (512 chars). O comportamento de unicidade pelo UNIQUE constraint se mantém — dois usuários não podem ter o mesmo template (proteção contra duplicatas biométricas).

---

## Hardware do Terminal de Enrollment

| Componente | Especificação | Função |
|---|---|---|
| ESP32S | Já possuído | Conectividade Wi-Fi + MQTT + controle UART |
| ZN-53X / A21 UART | Já possuído | Captura e extração de template biométrico |
| LED RGB (ou 3 LEDs) | A adquirir (baixo custo) | Feedback visual ao usuário durante captura |
| Case/suporte | Impressão 3D ou caixa plástica | Montagem definitiva para uso no IFSP |

### Pinout ESP32 ↔ ZN-53X

| Pino ESP32 | Pino ZN-53X | Função |
|---|---|---|
| GPIO16 (RX2) | TX | Recebe dados do sensor |
| GPIO17 (TX2) | RX | Envia comandos ao sensor |
| 3.3V ou 5V | VCC | Alimentação (verificar datasheet do módulo) |
| GND | GND | Terra comum |
| GPIO25 | LED Vermelho | Erro / negado |
| GPIO26 | LED Verde | Sucesso / concedido |
| GPIO27 | LED Azul | Aguardando dedo |

> **Nota:** Verificar fisicamente se o ZN-53X/A21 opera em 3.3V ou 5V para lógica UART. O ESP32 opera em 3.3V — se o sensor for 5V, usar divisor de tensão na linha TX do sensor para o RX do ESP32.

---

## Critérios de Aceite

- [ ] **CA-01** — Terminal conecta ao broker MQTT e publica `register` com `role: "enrollment-terminal"`
- [ ] **CA-02** — Ao receber `enrollment/start`, o sensor ZN-53X responde ao `verifyPassword()` da biblioteca Adafruit com `FINGERPRINT_OK`
- [ ] **CA-03** — Captura de 2 passagens do dedo gera template via `createModel()` com sucesso
- [ ] **CA-04** — `getModel()` (UploadTemplate 0x08) retorna exatamente 256 bytes do template
- [ ] **CA-05** — Template é publicado em `enrollment/result` como string hex de 512 caracteres
- [ ] **CA-06** — Backend persiste o template em `access_credential.value` com `type = FINGERPRINT`
- [ ] **CA-07** — Backend dispara `sync-credentials` para ao menos um controlador de acesso ativo
- [ ] **CA-08** — Controlador de acesso carrega o template no ZN-53X via `storeModel()` e registra o slot em `controller_credential_slot`
- [ ] **CA-09** — Após sync, o controlador consegue fazer matching do mesmo dedo com `fingerFastSearch()` retornando `FINGERPRINT_OK` + slotId correto
- [ ] **CA-10** — O slotId é resolvido para `credentialId` → publicado como `access-attempt` → backend retorna `GRANTED` para usuário com permissão
- [ ] **CA-11** — Ao excluir uma credencial no portal, o backend publica `delete-credential` e o controlador remove o slot correspondente do ZN-53X
- [ ] **CA-12** — Template duplicado (mesmo dedo passado duas vezes) é rejeitado com 409 Conflict
- [ ] **CA-13** — Enrollment com timeout (usuário não passa o dedo em 30s) publica `enrollment/result` com `status: FAILED` e o portal exibe mensagem amigável

---

## Dependências e Bloqueios

### Depende de
- **HW-001** parcial — firmware base com Wi-Fi + MQTT funcional (já validado nos testes)
- **CRED-001** parcial — schema de `access_credential` e endpoint de registro já existem

### Bloqueia
- **HW-002** — integração biométrica nos controladores de acesso depende do formato de template definido aqui
- **CRED-001** completo — o fluxo de cadastro via portal só estará funcional end-to-end após este terminal

### Não bloqueia (pode ser feito em paralelo)
- PERM-005, LOG-002, UI-010, CRED-002 (NFC), HW-003 (RFID)

---

## Notas de Implementação

### Compatibilidade do ZN-53X com a biblioteca Adafruit

O ZN-53X e o módulo A21 UART Boland usam o protocolo serial padrão do chip GROW R30x (start code `0xEF01`, pacotes estruturados com checksum). A biblioteca `Adafruit_Fingerprint` implementa exatamente este protocolo. A compatibilidade precisa ser **confirmada fisicamente** como primeiro passo do desenvolvimento:

```cpp
// Teste mínimo de compatibilidade
Adafruit_Fingerprint finger(&Serial2);
finger.begin(57600);
if (finger.verifyPassword()) {
  Serial.println("ZN-53X encontrado e respondendo!");
} else {
  Serial.println("Sensor não encontrado — verificar baudrate e fiação");
}
```

Se o `verifyPassword()` falhar, tentar baudrates alternativos: 9600, 115200.

### Extração do template (comando crítico)

O comando `getModel()` (UploadTemplate `0x08`) transfere o template do buffer interno do sensor para o UART em múltiplos pacotes de dados. A biblioteca Adafruit não encapsula a leitura dos pacotes de dados subsequentes — será necessário implementar a leitura manual dos data packets após o ack inicial:

```cpp
// Após createModel() e loadModel(slot):
finger.getModel(); // envia comando UPLOAD
// Ler os data packets manualmente via getStructuredPacket()
// até receber FINGERPRINT_ENDDATAPACKET (0x08)
// Concatenar os bytes de dados de cada pacote
// Resultado: buffer de 256 bytes = template completo
```

O mesmo processo invertido (`DownloadTemplate` `0x09`) é usado nos controladores para carregar o template recebido do backend de volta no ZN-53X.

### Gerenciamento de slots nos controladores

Cada ZN-53X suporta até 162 templates (slots 0–161). O backend deve rastrear quais slots estão ocupados em cada controlador via `controller_credential_slot` e alocar o próximo slot livre no payload de `sync-credentials`.

### Segurança do template em trânsito

O template biométrico trafega em texto no payload MQTT. Para o protótipo do TCC isso é aceitável, mas a monografia deve documentar que em produção o canal MQTT deve usar TLS (MQTT over TLS, porta 8883) para proteger os dados biométricos em trânsito.

### O WA26 no contexto atual

O WA26 e o hook `useFingerprintReader` permanecem no codebase para demonstração do modo `keyboard` e do modo `hid` na interface web, mas **não participam do fluxo de produção de biometria**. O cadastro real de digitais passa pelo terminal ZN-53X. Isso deve ser documentado na monografia como decisão arquitetural motivada pela incompatibilidade de templates entre fabricantes diferentes.