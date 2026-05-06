# Plano de Implementação: Terminal Biométrico (NodeMCU + ZW-111)

## Visão Geral
Este plano estrutura a integração e o desenvolvimento do terminal biométrico usando um sensor ZW-111 (UART) e o microcontrolador NodeMCU v3. A arquitetura de comunicação seguirá o mesmo padrão implementado para o NFC-terminal, integrando com o MQTT via eventos `access-attempt` e resolvendo permissões da retaguarda com `access-result`.

## Etapas de Implementação

### BIO-001 — Hardware e Firmware Base
**Objetivo:** Estabelecer a comunicação inicial e captura biométrica baseada em Toque (TouchOut).

- [ ] Validar conexão e esquema elétrico no guia de conexão (`connection-guide.md`).
- [ ] Adaptar o arquivo principal (`firmware-biometry-terminal.ino`) para usar o `SoftwareSerial`.
- [ ] Implementar leitura usando a biblioteca `Adafruit_Fingerprint` ou comando UART bruto.
- [ ] Incorporar no fluxo principal a detecção de dedo com o pino de interrupção ou `TouchOut`.

### BIO-002 — Sincronização de Templates Biométricos (Opcional/Avançado)
**Objetivo:** Permitir cadastro centralizado. Como os sensores exigem que as digitais sejam cadastradas no seu próprio banco de imagem primário:
- [ ] Avaliar viabilidade de exportar `templates` do ZW-111 via UART (COM `Adafruit_Fingerprint` chamando a função de ler character file).
- [x] **CORREÇÃO APLICADA (2025-05-03):** o retorno observado no serial era `35` decimal (`0x23`, template vazio). O firmware agora tenta `PS_UpChar` nos buffers 1 e 2 após `createModel()` e mantém a escrita do registrador 7 via `PS_WriteReg`.
  - Arquivos corrigidos: `firmware-biometry-terminal.ino` e `zw111_basic/zw111_basic.ino`
  - Próxima ação: **Recompilar e fazer upload do firmware atualizado**, depois testar novamente o fluxo de enrollment e verificar qual buffer o sensor expõe.
- [ ] Implementar rota no controller MQTT para recebimento remoto de `templates` (Sincronização Server->Dispositivo).
- [ ] Alterar o `publishAccessAttempt` provido no código mockado - que só lê ID local - para talvez ler as características biométricas brutas e autorizar.

> **Nota:** Caso não haja viabilidade/desejo do sync global, o cadastro será no hardware, associando o NodeID e FingerID ao `CredentialValue` no payload MQTT.

### BIO-003 — Ajuste na API & Backend
**Objetivo:** Integrar novos tipos de credencial e tópicos MQTT.

- [ ] O backend já valida `credentialType` como `FINGERPRINT` ou `NFC_TAG`; manter o firmware biométrico publicando `FINGERPRINT`.
- [ ] Cadastrar o controller no portal do Admin com a Flag `sensorModel: ZW-111`.
- [ ] Habilitar página de pareamento (`users/biometrics-tags.tsx` ou análogo) similar à de NFC.

### BIO-004 — Feedback Sensorial
**Objetivo:** O sensor ZW-111 possui um anel de LED RGB.
- [ ] Interpretar comandos UART de Aura/Iluminação do sensor.
- [ ] Modificar `firmware-biometry-terminal.ino` para brilhar em VERDE em `GRANTED` (Recebeu MQTT Access-result) e VERMELHO em `DENIED`.

### BIO-005 — Testes E2E
**Objetivo:** Fluxo de uso validado.

- [ ] Upload para o HW via Arduino IDE.
- [ ] Apertar o dedo => Acende o Sensor (TouchOut) => Captura => MQTT manda UID.
- [ ] Concede/Nega via Mosquitto Observer.
