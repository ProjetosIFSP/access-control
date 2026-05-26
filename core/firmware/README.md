# Guia de Conexão e Plano de Implementação: Terminal Unificado (ESP32)

Este documento detalha o plano de implementação e o guia de conexão para o novo firmware unificado, que engloba as funcionalidades de **NFC (RC522)** e **Biometria (ZW-101)** rodando simultaneamente em um único **ESP32 (30 pinos)**.

## Plano de Implementação

A arquitetura do firmware foi refatorada e dividida em módulos (bibliotecas locais) para garantir encapsulamento e fácil manutenção. O projeto está estruturado da seguinte forma:

- `firmware.ino`: Arquivo principal responsável pela orquestração, setup inicial, Wi-Fi Manager, conexão MQTT e loop principal.
- `NfcManager.h / .cpp`: Módulo responsável por inicializar e ler cartões/tags NFC usando o módulo MFRC522 via barramento SPI.
- `BiometryManager.h / .cpp`: Módulo responsável pelo gerenciamento completo do sensor biométrico ZW-101. Inclui o controle de LEDs (anel RGB), cadastro de digitais, sincronização com o servidor, extração de templates e uso de HardwareSerial nativo do ESP32 (evitando os gargalos do SoftwareSerial).
- `Config.h`: Definições globais de pinos, configurações de rede, timeouts e estruturas compartilhadas.

### Benefícios da Unificação
1. **Hardware Serial**: O ESP32 possui múltiplas UARTs por hardware (Serial0, Serial1, Serial2). Usamos a `Serial2` para a biometria, eliminando corrupção de dados comum no NodeMCU v3 (ESP8266) com `SoftwareSerial`.
2. **Desempenho**: Com dois núcleos, o ESP32 lida melhor com a comunicação MQTT assíncrona ao mesmo tempo em que pesquisa uma biometria ou lê um cartão RFID.
3. **Redução de Custos e Complexidade**: Um único terminal de porta controla ambas as formas de acesso.

---

## Guia de Conexão (Pinout ESP32 30 Pinos)

O ESP32 (versão de 30 pinos) possui uma disposição específica. Abaixo está o esquema de ligação recomendado para evitar conflitos com pinos de bootstrap.

### 1. Sensor NFC (MFRC522) -> Barramento VSPI
O MFRC522 utiliza SPI. No ESP32, o barramento VSPI padrão é a melhor escolha.

| Pino MFRC522 | Pino ESP32 (30 Pinos) | Função |
| :--- | :--- | :--- |
| **SDA (SS)** | **D5** (GPIO5) | Chip Select (CS) |
| **SCK** | **D18** (GPIO18) | Clock SPI |
| **MOSI** | **D23** (GPIO23) | Master Out Slave In |
| **MISO** | **D19** (GPIO19) | Master In Slave Out |
| **RST** | **D22** (GPIO22) | Reset |
| **GND** | **GND** | Terra |
| **3.3V** | **3V3** | Alimentação (NUNCA ligue no 5V) |

### 2. Sensor Biométrico (HiLink ZW-101) -> UART2
O sensor ZW-101 comunica-se via UART (Serial) e precisa do sinal TouchOut para "acordar".

| Pino ZW-101 | Pino ESP32 (30 Pinos) | Função |
| :--- | :--- | :--- |
| **PIN1 (V_Touch)** | **3V3** | Alimentação do anel capacitivo (Touch) |
| **PIN2 (TouchOut)**| **D4** (GPIO4) | Sinal de interrupção ao tocar no sensor |
| **PIN3 (VCC)** | **3V3** | Alimentação do sensor (RX/TX lógicos a 3.3V) |
| **PIN4 (TX)** | **D16** (GPIO16 / RX2) | Conecta ao RX2 do ESP32 |
| **PIN5 (RX)** | **D17** (GPIO17 / TX2) | Conecta ao TX2 do ESP32 |
| **PIN6 (GND)** | **GND** | Terra |

### 3. Opcional (Fechadura / Relé / LED de Feedback)
Caso utilize um relé para acionar a fechadura ou um LED externo de indicação.

| Componente | Pino ESP32 | Função |
| :--- | :--- | :--- |
| **LED Interno** | **D2** (GPIO2) | Indica porta aberta ou Erro |
| **Relé (Fechadura)** | **D27** (GPIO27) | Controle do Solenoide/Eletroímã |

---

## Dependências Necessárias no Arduino IDE
Certifique-se de instalar as seguintes bibliotecas pela aba "Library Manager" no Arduino IDE:
1. **WiFiManager** por tzapu (versão para ESP32)
2. **PubSubClient** por Nick O'Leary
3. **ArduinoJson** por Benoit Blanchon (v6)
4. **MFRC522** por GithubCommunity
5. **Adafruit Fingerprint Sensor Library** por Adafruit

## Como rodar e compilar
1. Selecione a placa `DOIT ESP32 DEVKIT V1` (ou similar de 30 pinos) no Arduino IDE.
2. Abra a pasta `core/firmware/` que agora contém os arquivos em formato de abas (ou importe como biblioteca local).
3. Abra o arquivo `firmware.ino` e clique em Upload.
