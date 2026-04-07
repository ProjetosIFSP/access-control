# Guia de Conexão Física — Terminal Biométrico (NodeMCU v3 + Sensor ZW-111)

> **Escopo:** apenas o leitor biométrico conectado ao NodeMCU v3. Nenhum outro periférico
> (como relê ou reed switch) é montado nesta fase de teste.
> Para a arquitetura completa do terminal, consulte a documentação de arquitetura.

---

## Índice

1. [Introdução](#1-introdução)
2. [Lista de componentes necessários](#2-lista-de-componentes-necessários)
3. [Diagrama de conexão (Pinagem ZW-111)](#3-diagrama-de-conexão-pinagem-zw-111)
4. [Verificação elétrica antes de ligar](#4-verificação-elétrica-antes-de-ligar)

---

## 1. Introdução

O **ZW-111** é um sensor de impressão digital capacitivo com anel de LED RGB e interface UART. Ele suporta detecção de toque (TouchOut), o que permite que o microcontrolador fique em modo de economia de energia e seja "acordado" apenas quando um dedo toca no sensor.

No NodeMCU v3, utilizaremos `SoftwareSerial` para comunicar com os pinos de TX/RX do sensor, além de um pino digital para captar o sinal de `TouchOut` (detecção de dedo).

---

## 2. Lista de componentes necessários

Para esta fase de teste inicial, você precisará de:

| Componente | Quantidade | Observação |
|---|---|---|
| NodeMCU v3 (ESP8266MOD) | 1 | Com driver CH340 instalado no PC |
| Sensor biométrico ZW-111 | 1 | Interface 1.0mm * 6pin |
| Protoboard / Fios Jumper | Vários | Dupont line para conexão no NodeMCU |
| Cabo USB (Micro-B) | 1 | Para alimentação e upload de código |

---

## 3. Diagrama de conexão (Pinagem ZW-111)

O módulo ZW-111 possui uma interface de 6 pinos (passo de 1.0mm):

*   **PIN1:** V_Touch, 3.3V (Alimentação do anel capacitivo)
*   **PIN2:** TouchOut (Sinal de detecção de toque)
*   **PIN3:** VCC, 3.3V (Alimentação primária do sensor)
*   **PIN4:** TX (Transmissão de dados UART)
*   **PIN5:** RX (Recepção de dados UART)
*   **PIN6:** GND (Terra)

### Tabela de conexões propostas com NodeMCU v3

| Pino do Sensor (ZW-111) | → | Pino do NodeMCU v3 | Observação / Função |
|---|---|---|---|
| **PIN1: V_Touch (3.3V)** | → | **3V3** | Alimentação do sensor de toque |
| **PIN2: TouchOut** | → | **D5 (GPIO14)** | Lê o estado de toque (HIGH quando tocado) |
| **PIN3: VCC (3.3V)** | → | **3V3** | Alimentação do módulo UART |
| **PIN4: TX** | → | **D1 (GPIO5)** | RX do SoftwareSerial do ESP8266 |
| **PIN5: RX** | → | **D2 (GPIO4)** | TX do SoftwareSerial do ESP8266 |
| **PIN6: GND** | → | **GND** | Referência comum terra |

⚠️ **Atenção:** O sensor funciona em **3.3V**. Não conecte os pinos VCC ou V_Touch nos 5V/VIN (VU) do NodeMCU, sob risco de queimar o dispositivo!

### Diagrama ASCII

```
  NodeMCU v3 (ESP8266MOD)              Sensor Biométrico (ZW-111)
  ┌───────────────────────┐            ┌─────────────────────────┐
  │                       │            │                         │
  │   3V3 ────────────────┼────────────┼── PIN1: V_Touch (3.3V)  │
  │                       │            │                         │
  │   D5 (GPIO14) ────────┼────────────┼── PIN2: TouchOut        │
  │                       │            │                         │
  │   3V3 ────────────────┼────────────┼── PIN3: VCC (3.3V)      │
  │                       │            │                         │
  │   D1 (GPIO5) ─────────┼────────────┼── PIN4: TX              │
  │                       │            │                         │
  │   D2 (GPIO4) ─────────┼────────────┼── PIN5: RX              │
  │                       │            │                         │
  │   GND ────────────────┼────────────┼── PIN6: GND             │
  │                       │            │                         │
  └───────────────────────┘            └─────────────────────────┘
```

> **Nota sobre RX/TX:** Lembre-se sempre de cruzar os sinais UART. O TX do sensor vai para um pino que atuará como RX no NodeMCU (D1), e o RX do sensor no pino TX do NodeMCU (D2).

---

## 4. Verificação elétrica antes de ligar

Sempre confira os pinos antes de plugar o NodeMCU no USB:

1.  **VCC e GND:** Veja se não estão invertidos, o que poderia gerar um curto.
2.  **Cruzamento do RX/TX:** Certifique-se de que o cabo do PIN4 (TX do sensor) vá para o Pino D1 (RX configurado no software serial), enquanto o PIN5 (RX do sensor) vá no D2.
3.  Assegure-se de que os pinos V_Touch e VCC do sensor estejam ligados ao barramento de 3.3V.
