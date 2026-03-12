# Hardware — Itens do Projeto

## ✅ Possuídos

### Microcontroladores
- 1× ESP8266MOD / NodeMCU v3 ← **MCU principal do protótipo de fechadura** (USB nativo via CH340)
- 1× ESP-01
- 1× ESP-01S
- 1× ESP-32S ← **usado nos testes de firmware anteriores**
- 1× ESP32-CAM (AI-Thinker) ← **reserva / não usado no protótipo principal**

### Sensores Biométricos
- 1× Sensor de impressão digital ZN-53X / 63X
- 1× Módulo fingerprint A21 UART Boland
- 1× Leitor fingerprint WA26 USB Boland ← **usado para cadastro via portal web**

### RFID / NFC
- 3× Tags NFC
- 1× Smart card NFC "One Cartoon"
- ~~Leitor NFC standalone~~ — **não existe como item independente** — trata-se da bobina de antena da relay control board; ver nota abaixo

### Módulos de Atuação
- 1× Relay control board multifuncional (AliExpress) ← **⚠️ descartada do protótipo principal — controlador autônomo incompatível com controle MQTT centralizado**
  - **Fingerprint Interface** — conector JST 4 pinos no topo (VCC, GND, TX, RX para o ZN-53X) — board intercepta os dados, MCU não tem acesso
  - **Inductive Interface** — conector 3 pinos (circuito NFC/RFID embutido; lógica autônoma interna — UID não exposto ao MCU)
    - A **bobina de antena indutiva** (placa pequena marcada **IC V1.3A**, conector de 2 pinos **"C1"/"P1"**) é a antena passiva que se encaixa neste conector — **não é um leitor autônomo com protocolo de dados**. C1 e P1 são os dois terminais da bobina LC ressonante a 13,56 MHz. Sem a board, essa peça não produz nenhum sinal utilizável pelo ESP8266. O circuito NFC que lê o UID fica integrado na própria PCB da relay board.
  - **Switch Interface** — conector 2 pinos (único ponto de controle externo; apenas simula botão físico)
  - **Relay** — TONGLING JQC-T78-DC5V-C (bobina 5V interna; 20A 125VAC / 20A 14VDC nos contatos)
  - **NO / COM / NC** — terminais azuis do relê para a fechadura solenoide
  - **Power+ / Power−** — terminais azuis de alimentação da board (DC 10V–120V)
  - **Set button** — botão físico de configuração de modo
  - **Buzzer** — feedback sonoro integrado (acionado pela lógica interna da board)
  - ⚠️ A board converte a tensão de entrada para 5V internamente para acionar a bobina do relê — não expõe os 5V como saída utilizável pelo MCU
  - 📌 Mantida como peça de referência/demonstração e possível failsafe físico futuro — ver `.claude/guides/nodemcu-v3-simple-relay-architecture.md`

### Sensores e Componentes Eletrônicos
- 1× Sensor de corrente SCT-013 ← **testado no firmware ESP-32S**
- 1× Protoboard
- Resistores, fios e capacitores (sortidos)

---

## ❌ Necessários para protótipo funcional completo

### Atuação (fechadura)
- [ ] **Módulo relê simples 1 canal (5V, com optoacoplador)** ⚠️ *novo item obrigatório* — substitui a relay control board no protótipo principal; controlado diretamente pelo NodeMCU via GPIO5 (D1); ~R$5–10 no Mercado Livre / Shopee — buscar `"módulo relê 1 canal 5V optoacoplador"`
- [ ] **Fechadura solenoide 12V** ⚠️ *item mais crítico* — atuador eletromecânico que trava/destrava a porta (modelo fail-secure recomendado); conecta ao NO/COM do módulo relê simples
- [ ] **Fonte de alimentação 12V / 2A** — alimentar a fechadura solenoide e o step-down para o NodeMCU
- [ ] **Regulador de tensão step-down (LM2596 ou módulo buck)** — converter 12V → 5V para alimentar o NodeMCU via VIN e o módulo relê; ~R$8–15 — buscar `"step down LM2596"` ou `"módulo buck DC-DC"`
- [ ] **Diodo de proteção (1N4007 ou 1N4148)** — proteger o relé contra corrente reversa (flyback) da solenoide. Verificar se o módulo relê adquirido já possui diodo flyback na PCB antes de adicionar externo.

### Leitura NFC
- [ ] **Módulo leitor NFC/RFID independente (PN532 ou MFRC522)** ⚠️ *novo item obrigatório* — a bobina IC V1.3A pertence à relay board e não é utilizável isoladamente pelo firmware; para leitura de UID pelo NodeMCU é necessário um módulo com interface de dados própria. **PN532 recomendado** (suporta I2C, SPI e UART; biblioteca `Adafruit_PN532` madura; opera em 3,3V — compatível diretamente com ESP8266); alternativamente **MFRC522** (SPI, 3,3V, mais barato ~R$10, biblioteca `MFRC522` amplamente suportada). Buscar `"módulo PN532 NFC"` ou `"módulo MFRC522"` no Mercado Livre / Shopee.

### Detecção de estado da porta
- [ ] **Sensor magnético reed switch** — detectar porta aberta/fechada (ímã na porta + reed switch no batente); conectar ao GPIO4 (D2) com `INPUT_PULLUP`; ~R$3–8 — buscar `"reed switch porta magnético"`
- [ ] **Ímã de neodímio pequeno** — par do reed switch, fixado na porta

> 💡 O SCT-013 já possuído pode complementar ou substituir o reed switch para detectar se a fechadura está energizada (corrente).

### Feedback ao usuário
- [ ] **LED RGB** ou LEDs individuais (verde + vermelho) — indicação visual de acesso concedido/negado
- [ ] **Buzzer ativo 5V** — feedback sonoro no acesso

### Estrutura e montagem
- [ ] **Placa de circuito perfurada (ou PCB)** — montagem definitiva fora da protoboard
- [ ] **Caixa/case para o módulo** — proteção do ESP8266 + sensores + relé (impressão 3D ou caixa plástica)
- [ ] **Conectores parafuso (KRE / bornes)** — conexão da fechadura e alimentação sem solda exposta
- [ ] **Kit de parafusos e suportes** — fixação na porta/batente
- [ ] **Cabos jumper macho-fêmea e fêmea-fêmea** — conexões entre módulos com pinos header

### Para desenvolvimento e debug
- [ ] **Multímetro** — medir tensões, corrente e continuidade durante montagem
- [ ] **Adaptador USB-Serial (FTDI / CP2102 / CH340G)** ⚠️ *obrigatório para programar o ESP32-CAM* — o ESP32-CAM não possui entrada USB; este adaptador faz a ponte entre o USB do computador e os pinos TX/RX do ESP32-CAM. Buscar no Mercado Livre / Shopee por "conversor USB serial CP2102" ou "módulo FTDI FT232RL" (R$10–R$25). **Confirmar que o modelo possui jumper ou chave de seleção de tensão 3.3V / 5V** — usar sempre em 3.3V.
- [ ] **Resistores 10kΩ (pack com pelo menos 5)** — pull-down nos GPIOs de boot strapping do ESP32-CAM (GPIO12 obrigatório; GPIO0, GPIO2, GPIO15 conforme necessidade). Sem esses resistores o ESP32-CAM pode entrar em boot loop ao ligar com componentes conectados nesses pinos.

### Comunicação e alimentação backup
- [ ] **Acesso à rede Wi-Fi do campus** — conectividade para o ESP32 em ambiente real
- [ ] **Bateria de backup (opcional)** — ex: 18650 + módulo carregador TP4056 para manter o sistema durante breves quedas de energia

---

## 🔢 Prioridade de aquisição

| Prioridade | Item | Motivo |
|------------|------|--------|
| 🔴 Alta | Módulo relê simples 1 canal (5V) | **Item central** — substitui a relay board; controle direto pelo NodeMCU via GPIO |
| 🔴 Alta | **Módulo leitor NFC independente (PN532 ou MFRC522)** | **Novo item obrigatório** — a bobina IC V1.3A da relay board não é utilizável pelo firmware isoladamente |
| 🔴 Alta | Fechadura solenoide 12V | Sem ela não há atuação física |
| 🔴 Alta | Fonte 12V / 2A | Alimentar a fechadura e o step-down |
| 🔴 Alta | Regulador step-down (LM2596 / buck) | 12V → 5V para alimentar o NodeMCU via VIN e o módulo relê |
| 🟡 Média | Reed switch + ímã | Detectar estado real da porta |
| 🟡 Média | LED RGB + buzzer | Feedback ao usuário na porta (modo terminal e acesso) |
| 🟢 Baixa | Adaptador USB-Serial (CP2102 / FTDI) | Não necessário para o NodeMCU v3 (USB nativo); útil apenas se usar o ESP32-CAM |
| 🟢 Baixa | Resistores 10kΩ (pack) | Pull-down para boot strapping do ESP32-CAM — desnecessário para NodeMCU v3 |
| 🟢 Baixa | Placa perfurada + case | Montagem final para apresentação do TCC |
| 🟢 Baixa | Diodo de proteção | Verificar se o módulo relê adquirido já possui; adicionar se necessário |

---

## 📝 Notas

- O **leitor WA26** opera em modo de emulação de teclado — compatível com o hook `useFingerprintReader` no modo `"keyboard"` (padrão). **Não participa do fluxo de produção de biometria** — os templates Boland são incompatíveis com o ZN-53X. Mantido apenas para demonstração do hook na UI. Ver aviso em `.claude/guides/wa26-hid-guide.md`.
- O **NodeMCU v3 (ESP8266MOD)** é o **MCU principal do protótipo de fechadura**. Possui USB nativo via CH340 (não precisa de adaptador FTDI), 11 GPIOs digitais utilizáveis, SoftwareSerial para o ZN-53X e I2C/SPI para o módulo leitor NFC a adquirir. Ver pinout completo e justificativa em `.claude/guides/nodemcu-v3-simple-relay-architecture.md`.
- O **ESP32-CAM** (AI-Thinker) foi o MCU planejado originalmente, mas foi substituído pelo NodeMCU v3 por ter USB indireto (exige adaptador FTDI), restrições complexas de boot strapping e câmera desnecessária para o projeto. Mantido como reserva.
- O **ESP-32S** foi usado nos testes iniciais de firmware. Pode ser mantido como placa de desenvolvimento/debug secundária.
- A **relay control board** (AliExpress) foi **descartada do protótipo principal** — é um controlador de acesso autônomo que intercepta dados do ZN-53X e NFC internamente, impedindo que o backend MQTT seja a autoridade de acesso. O único ponto de controle externo (Switch Interface) só simula um botão físico, sem expor estado real da fechadura. Mantida como peça de referência e possível failsafe físico futuro. Ver análise completa em `.claude/guides/nodemcu-v3-simple-relay-architecture.md`.
- O **módulo relê simples de 1 canal (5V)** substitui a relay control board no protótipo. O NodeMCU controla o relê **diretamente** via GPIO5 (D1): `digitalWrite(PIN_RELAY, LOW)` = abre; `HIGH` = fecha. O módulo possui optoacoplador — isolamento elétrico entre o circuito de controle (3.3V) e o circuito de carga (12V da fechadura).
- O **"leitor NFC standalone"** mencionado em versões anteriores deste documento **não existe como componente independente** — trata-se da **bobina de antena indutiva** (placa IC V1.3A, conector 2 pinos C1/P1) pertencente ao kit da relay control board (AliExpress). Essa bobina é a antena passiva LC ressonante a 13,56 MHz que o circuito NFC interno da board usa para detectar cartões — ela não possui lógica, processamento ou pinos de dados utilizáveis pelo ESP8266 isoladamente. Para leitura de NFC pelo firmware, é necessário **adquirir um módulo leitor NFC independente** (PN532 ou MFRC522) conectado diretamente ao NodeMCU v3.
- O **sensor ZN-53X / A21 UART** usa protocolo R30x (GROW) via UART — comunicação com o NodeMCU via `SoftwareSerial` nos pinos D5 (GPIO14, RX) e D6 (GPIO12, TX). **Compatibilidade a confirmar fisicamente** com a biblioteca `Adafruit Fingerprint Sensor Library` (start code `0xEF01`, pacotes estruturados com checksum). Ver `.claude/features/HARDWARE/hw-007-enrollment-terminal.md` e `.claude/test/enrollment-terminal/README.md`.
- O **CS9711 embutido no notebook** (ID USB `2541:0236`) usa classe Vendor Specific (0xFF) com transferência Bulk — **não é HID**, não aparece na Web HID API, não é compatível com o sistema. Ignorar.