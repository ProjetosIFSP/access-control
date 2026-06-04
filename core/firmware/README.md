# Guia de Conexão e Plano de Implementação: Terminal Unificado (ESP32)

Este documento detalha o plano de implementação e o guia de conexão para o novo firmware unificado, que engloba as funcionalidades de **NFC (RC522)** e **Biometria (ZW-101)** rodando simultaneamente em um único **ESP32 (30 pinos)**, controlando uma **fechadura bolt lock 5YOA DC12V fail-safe com pass detector** (indução magnética).

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

### 3. Fechadura / Relé / LED de Feedback
Conexões de controle da fechadura e indicação.

| Componente | Pino ESP32 | Função |
| :--- | :--- | :--- |
| **LED Interno** | **D2** (GPIO2) | Indica porta aberta ou Erro |
| **Relé (Fechadura)** | **D27** (GPIO27) | Controle do Solenoide/Eletroímã |

---

## Guia de Montagem da Alimentação e Fechadura (12V)

**Passo 1: Alta Tensão (Tomada -> Fonte Colmeia)**
Com a tomada desconectada da parede:
- **Fio 1** do cabo paralelo: Prenda no borne `L` da colmeia.
- **Fio 2** do cabo paralelo: Prenda no borne `N` da colmeia.

**Passo 2: Alimentação do Step-Down (12V Brutos)**
- **Borne V+** da colmeia: Puxe um fio até o `VIN+` do Step-Down.
- **Borne V-** da colmeia: Puxe um fio até o `VIN-` do Step-Down.
> **Nota**: Ligue na tomada e regule a saída do Step-Down para 5V com o multímetro *antes* de avançar.

**Passo 3: Alimentação da Lógica (5V Regulados -> Protoboard)**
- **OUT+** do Step-Down (5V): Puxe para a Linha Vermelha lateral da protoboard.
- **OUT-** do Step-Down (GND): Puxe para a Linha Azul lateral da protoboard.
- Conecte o pino **VIN** do ESP32 na Linha Vermelha (5V).
- Conecte o pino **GND** do ESP32 na Linha Azul (GND).
- Conecte o pino **VCC** do Módulo Relé na Linha Vermelha (5V).
- Conecte o pino **GND** do Módulo Relé na Linha Azul (GND).
- Conecte o pino **IN** do Módulo Relé em um pino digital do ESP32 (ex: GPIO 27).

**Passo 4: O Circuito de Potência e o Diodo (A Ramificação de 12V)**
Agora vamos usar duas fileiras vazias na protoboard para o diodo (vamos usar como exemplo as Fileiras 10 e 11).
- **Fixando o Diodo**:
  - Espete a perna do diodo que tem a faixa cinza na Fileira 10.
  - Espete a outra perna do diodo (lado todo preto) na Fileira 11.
- **Fechando as Conexões de 12V**:
  - No **borne V+** da colmeia: Puxe um fio até o borne **COM** (Comum - Meio) do Módulo Relé.
  - No **borne V-** da colmeia: Puxe um fio até a **Fileira 11** da protoboard (onde está o lado preto do diodo).

**Passo 5: Ligando a Fechadura (2 fios)**
A fechadura 5YOA possui apenas **2 fios** de alimentação (vermelho e preto). O pass detector interno é um ímã sem conexão elétrica externa.
- Puxe um fio do borne **NC** (Normalmente Fechado) do Módulo Relé e mande para a **Fileira 10** da protoboard (onde está a faixa cinza do diodo).
- **Fio Vermelho** da Fechadura (12V+): Espete na **Fileira 10** da protoboard.
- **Fio Preto** da Fechadura (GND): Espete na **Fileira 11** da protoboard.

> **Nota**: A fechadura é **fail-safe**: sem energia → bolt recolhida (destrancada), com energia → bolt estendida (trancada). O relé corta/fornece a energia para controlar a trava.

🔍 **Resumo de como as Fileiras 10 e 11 vão ficar**:
- **Fileira 10** (Ponto Positivo Interrompido pelo Relé):
  - Perna do diodo com a Faixa Cinza.
  - Fio vindo do borne NC do Relé.
  - Fio Vermelho da Fechadura.
- **Fileira 11** (Ponto Negativo Direto da Colmeia):
  - Perna do diodo Toda Preta.
  - Fio vindo direto do borne V- da Colmeia.
  - Fio Preto da Fechadura.

### Sobre o Pass Detector (Indução Magnética) e Lógica de Trancamento
A fechadura 5YOA possui um **pass detector interno por indução magnética**. Ele é composto por um ímã embutido na contraplaca que se comunica magneticamente com o corpo da fechadura. **Não há fios de sinal** — o mecanismo é inteiramente mecânico/magnético.

**Funcionamento**:
- Quando a porta está **fechada** (ímã da contraplaca alinhado com o corpo da fechadura), o sensor interno detecta o alinhamento e permite que o bolt se estenda assim que a energia for ligada.
- Quando a porta está **aberta** (ímã longe), o bolt não se estende mesmo com energia — evitando que a trava se feche no ar.

**Lógica de Trancamento (Toggle)**: O firmware não usa timeout e opera como um **interruptor (toggle)**:
- Por padrão, a fechadura inicia **TRANCADA** (relé desligado → NC fecha → energia da colmeia passa pela fechadura → bolt estendida).
- Ao passar uma credencial autorizada (ou enviar comando MQTT), o estado **alterna**: se estiver trancada, ela **destranca** (relé aciona → NC abre → corta energia → bolt recolhe por fail-safe); se estiver destrancada, ela **tranca** (relé desliga → NC fecha → energia volta → bolt estende).
- Isso garante que a porta permaneça livre enquanto houver uso da sala, sendo trancada apenas por intervenção intencional.

> **Nota sobre compatibilidade 3.3V ↔ 5V**: O ESP32 é 3.3V, mas a maioria dos módulos relé com optoacoplador operam com lógica 5V. Um GPIO em HIGH (3.3V) não é suficiente para desativar o optoacoplador alimentado com 5V (5V - 3.3V = 1.7V ainda o mantém parcialmente ON). O firmware resolve isso usando `OUTPUT_OPEN_DRAIN` no GPIO do relé: HIGH = pino flutuante (sem corrente → relé desativa), LOW = puxa para GND (corrente flui → relé ativa). Nenhum level-shifter ou componente extra é necessário.

### Diagnóstico via Serial Monitor
O firmware possui comandos de diagnóstico acessíveis pelo Serial Monitor (115200 baud, Newline):

| Comando | Descrição |
| :--- | :--- |
| `RELAY_TEST` | Alterna GPIO 5x entre LOW/HIGH com 2s de intervalo. Observe o LED do módulo e o click para determinar se é Active-LOW ou Active-HIGH. |
| `LOCK` | Tranca a fechadura diretamente (sem MQTT). |
| `UNLOCK` | Destranca a fechadura diretamente (sem MQTT). |
| `STATUS` | Mostra o estado atual da porta e configuração do relé. |
| `HELP` | Lista todos os comandos disponíveis. |

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
