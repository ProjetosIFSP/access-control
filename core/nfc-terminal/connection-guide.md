# Guia de Conexão Física — Terminal RFID (NodeMCU v3 + RC522 via SPI)

> **Escopo:** apenas o leitor RFID conectado ao NodeMCU v3. Nenhum outro periférico
> (sensor biométrico, relê, reed switch) é montado nesta fase de teste.
> Para a arquitetura completa do terminal, consulte a documentação de arquitetura.

---

## Índice

1. [Introdução — O que é o RC522 e por que SPI](#1-introdução)
2. [Identificar o modelo do leitor RFID](#2-identificar-o-modelo-do-leitor-rfid)
3. [Lista de componentes necessários](#3-lista-de-componentes-necessários)
4. [Diagrama de conexão](#4-diagrama-de-conexão)
5. [Verificação elétrica antes de ligar](#5-verificação-elétrica-antes-de-ligar)
6. [Possíveis problemas com SPI no ESP8266](#6-possíveis-problemas-com-spi-no-esp8266)

---

## 1. Introdução

### O que é o RC522

O **RC522** (MFRC522) é um controlador RFID fabricado pela NXP Semiconductors,
amplamente usado em projetos de controle de acesso. Ele consegue ler e escrever tags
de frequência 13.56MHz (cartões Mifare, etc.) e é o chip presente na maioria dos
módulos de leitura RFID avulsos vendidos para prototipagem de baixo custo.

### Por que SPI

Diferente do PN532 que suporta I2C e UART nativamente na maioria dos módulos,
o RC522 na grande maioria dos módulos genéricos expõe apenas a interface **SPI**.
O SPI exige mais pininhos para conexão (MISO, MOSI, SCK, SS e RST), mas é extremamente estável.
No NodeMCU v3, utilizamos os pinos de hardware SPI (HSPI) nativos para comunicação direta.

---

## 2. Identificar o modelo do leitor RFID

Confirme qual chip está no seu módulo para não confundir a pinagem:

- **Chip principal:** pequeno (~5×5 mm), gravado "MFRC522".
- **PCB:** quase sempre verde ou azul, antena PCB menor e integrada.
- **Pinos:** VCC, GND, RST, SDA (SS/CS), MOSI, MISO, SCK. A interface é puramente SPI.
- **Sem jumpers** de seleção de protocolo. Tudo é resolvido pelo SPI C/S.

---

## 3. Lista de componentes necessários

Para esta fase de teste inicial, você precisará de:

| Componente | Quantidade | Observação |
|---|---|---|
| NodeMCU v3 (ESP8266MOD) | 1 | Com driver CH340 instalado no PC |
| Leitor RFID RC522 | 1 | Operante em 13.56 MHz |
| Protoboard | 1 | 400 ou 830 furos — qualquer tamanho serve |
| Jumpers macho-fêmea | 7 | VCC, GND, RST, MISO, MOSI, SCK, SDA (SS) |
| Cabo USB (Micro-B) | 1 | Para alimentação do Node e upload do código |

> **Multímetro:** não é obrigatório, mas é recomendado para realizar as checagens 
> elétricas de curto descritas abaixo.

---

## 4. Diagrama de conexão

### Tabela de conexões

| Pino do RC522 | → | Pino do NodeMCU v3 | GPIO / Função SPI |
|---|---|---|---|
| **3.3V / VCC** | → | **3V3** | **3,3 V apenas** — nunca conectar ao 5V/VIN |
| **RST** | → | **D3** | GPIO0 — Reset / inicialização do leitor |
| **GND** | → | **GND** | GND comum |
| **IRQ** | → | — | Não conectado (usado apenas com interrupções) |
| **MISO** | → | **D6** | GPIO12 — Master In Slave Out (HSPI MISO) |
| **MOSI** | → | **D7** | GPIO13 — Master Out Slave In (HSPI MOSI) |
| **SCK** | → | **D5** | GPIO14 — Serial Clock (HSPI CLK) |
| **SDA (SS)** | → | **D8** | GPIO15 — Slave Select (Chip Select - CS) |

⚠️ **Atenção Máxima com o VCC:** Alimentar o RC522 com 5V geralmente o destrói imediatamente. Ele suporta apenas lógica de 3.3V.

### Diagrama ASCII

```
  NodeMCU v3 (ESP8266MOD)              Leitor RFID (RC522)
  ┌───────────────────────┐            ┌──────────────────┐
  │                       │            │                  │
  │   3V3 ────────────────┼────────────┼── 3.3V (VCC)     │
  │                       │            │                  │
  │   GND ────────────────┼────────────┼── GND            │
  │                       │            │                  │
  │   D3  (GPIO0)  ───────┼────────────┼── RST            │
  │                       │            │                  │
  │   D6  (GPIO12) ───────┼────────────┼── MISO           │
  │                       │            │                  │
  │   D7  (GPIO13) ───────┼────────────┼── MOSI           │
  │                       │            │                  │
  │   D5  (GPIO14) ───────┼────────────┼── SCK            │
  │                       │            │                  │
  │   D8  (GPIO15) ───────┼────────────┼── SDA (SS)       │
  │                       │            │                  │
  └───────────────────────┘            └──────────────────┘
```

---

## 5. Verificação elétrica antes de ligar

Sempre confira os pinos antes de plugar o NodeMCU no USB:

1. **VCC e GND:** Veja se estão invertidos na protoboard. 
2. **Continuidade (se tiver multímetro):** Meça a resistência entre o pino do RC522 e o encaixe de cima do NodeMCU para descartar jumpers quebrados. Particularmente as linhas SPI costumam falhar com um único jumper danificado.
3. **MISO vs MOSI:** É comum inverter eses dois sem querer. Confira se o MOSI do leitor vai no D7 do node, e MISO no D6.

---

## 6. Possíveis problemas com SPI no ESP8266

| Problema | Causa provável | Solução |
|---|---|---|
| Módulo não é detectado / Inicialização falha | Jumpers trocados ou invertidos | Verifique especificamente os cabos D5, D6, D7 e D8. O Slave Select deve ficar em GPIO15. |
| NodeMCU preso no Boot Loop (luz não apaga) | O pino D8 (GPIO15) controla o boot state | O GPIO15 deve estar em *LOW* no boot. Se o módulo travar muito a tensão ali, o NodeMCU pode crachar no boot. Se ocorrer, tire o D8, inicie, e plugue-o novamente. |
| Leituras intermitentes | Módulo com má solda ou cabos bambos | Solde os Headers e use pinos firmes na protoboard. |
| RC522 muito quente | Alimentado no pino errado (5V) | Desligue imediatamente e troque pro pino 3V3. |