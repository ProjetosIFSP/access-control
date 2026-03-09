# Hardware — Itens do Projeto

## ✅ Possuídos

### Microcontroladores
- 1× ESP8266MOD com módulo Wi-Fi
- 1× ESP-01
- 1× ESP-01S
- 1× ESP-32S ← **usado nos testes de firmware**

### Sensores Biométricos
- 1× Sensor de impressão digital ZN-53X / 63X
- 1× Módulo fingerprint A21 UART Boland
- 1× Leitor fingerprint WA26 USB Boland ← **usado para cadastro via portal web**

### RFID / NFC
- 1× Leitor NFC
- 3× Tags NFC
- 1× Smart card NFC "One Cartoon"

### Sensores e Componentes Eletrônicos
- 1× Sensor de corrente SCT-013 ← **testado no firmware ESP-32S**
- 1× Protoboard
- Resistores, fios e capacitores (sortidos)

---

## ❌ Necessários para protótipo funcional completo

### Atuação (fechadura)
- [ ] **Fechadura solenoide 12V** ⚠️ *item mais crítico* — atuador eletromecânico que trava/destrava a porta (modelo fail-secure recomendado)
- [ ] **Módulo relé 5V (1 canal)** — interface entre ESP32 (3.3V/5V) e fechadura (12V)
- [ ] **Fonte de alimentação 12V / 2A** — alimentar a fechadura solenoide
- [ ] **Regulador de tensão (step-down ou LM7805)** — converter 12V → 5V/3.3V para alimentar ESP32 quando não estiver no USB
- [ ] **Diodo de proteção (1N4007 ou 1N4148)** — proteger o relé contra corrente reversa (flyback) da solenoide

### Detecção de estado da porta
- [ ] **Sensor magnético reed switch** — detectar porta aberta/fechada (ímã na porta + reed switch no batente)
- [ ] **Ímã de neodímio pequeno** — par do reed switch, fixado na porta

> 💡 O SCT-013 já possuído pode complementar ou substituir o reed switch para detectar se a fechadura está energizada (corrente).

### Feedback ao usuário
- [ ] **LED RGB** ou LEDs individuais (verde + vermelho) — indicação visual de acesso concedido/negado
- [ ] **Buzzer ativo 5V** — feedback sonoro no acesso

### Estrutura e montagem
- [ ] **Placa de circuito perfurada (ou PCB)** — montagem definitiva fora da protoboard
- [ ] **Caixa/case para o módulo** — proteção do ESP32 + sensores + relé (impressão 3D ou caixa plástica)
- [ ] **Conectores parafuso (KRE / bornes)** — conexão da fechadura e alimentação sem solda exposta
- [ ] **Kit de parafusos e suportes** — fixação na porta/batente
- [ ] **Cabos jumper macho-fêmea e fêmea-fêmea** — conexões entre módulos com pinos header

### Para desenvolvimento e debug
- [ ] **Multímetro** — medir tensões, corrente e continuidade durante montagem

### Comunicação e alimentação backup
- [ ] **Acesso à rede Wi-Fi do campus** — conectividade para o ESP32 em ambiente real
- [ ] **Bateria de backup (opcional)** — ex: 18650 + módulo carregador TP4056 para manter o sistema durante breves quedas de energia

---

## 🔢 Prioridade de aquisição

| Prioridade | Item | Motivo |
|------------|------|--------|
| 🔴 Alta | Fechadura solenoide 12V | Sem ela não há atuação física |
| 🔴 Alta | Módulo relé 5V | Interface obrigatória entre ESP e fechadura |
| 🔴 Alta | Fonte 12V / 2A | Alimentar a fechadura |
| 🟡 Média | Reed switch + ímã | Detectar estado real da porta (SCT-013 já cobre parcialmente) |
| 🟡 Média | LED RGB + buzzer | Feedback ao usuário na porta |
| 🟢 Baixa | Placa perfurada + case | Montagem final para apresentação do TCC |
| 🟢 Baixa | Diodo de proteção + regulador | Refinamento e proteção do circuito |

---

## 📝 Notas

- O **leitor WA26** opera em modo de emulação de teclado — compatível com o hook `useFingerprintReader` no modo `"keyboard"` (padrão). O `vendorId` e `productId` reais precisam ser identificados fisicamente (ver guia em `.claude/guides/wa26-hid-guide.md`).
- O **ESP-32S** está sendo usado nos testes por ter mais memória e velocidade que o ESP8266. O firmware final pode ser portado para ESP8266 (NodeMCU) se necessário para redução de custo.
- O **sensor ZN-53X / A21 UART** usa protocolo serial (UART) — requer biblioteca customizada ou protocolo documentado pelo fabricante. Verificar compatibilidade com a biblioteca `Adafruit Fingerprint Sensor Library` ou implementar protocolo proprietário.