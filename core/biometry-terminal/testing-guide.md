# Guia de Teste — Terminal Biométrico

Este guia descreve o passo a passo para validar o funcionamento do leitor biométrico (NodeMCU v3 + ZW-111) após realizar as conexões físicas e o upload do firmware (`firmware-biometry-terminal.ino`).

---

## 1. Preparação e Monitor Serial

1. Com o NodeMCU conectado via USB ao computador, abra a IDE do Arduino.
2. Vá em **Ferramentas > Monitor Serial** (Serial Monitor).
3. Configure a velocidade (baud rate) para **115200 baud**.
4. Pressione o botão **RST** (Reset) fisicamente na placa NodeMCU para reiniciar o sistema e capturar os logs desde o início.

## 2. Inicialização e Logs Esperados

No Monitor Serial, você deve observar a seguinte sequência de inicialização:

```text
=== Terminal Biométrico IFSP-PEP v1.0 ===
Controller ID: esp8266-bio-A1B2C3D4E5F6
Inicializando...
[BIO] Sensor biométrico encontrado!
```

> **Atenção:** Se a mensagem for `[BIO] Não foi possível encontrar o sensor biométrico.`, verifique as conexões **TX e RX**. Lembre-se que o TX do sensor (PIN4) vai no D1 da placa, e o RX do sensor (PIN5) vai no D2 (cruzamento de dados UART).

## 3. Conexão Wi-Fi e MQTT

Durante a inicialização, o NodeMCU tentará se conectar à rede salva. 

### A. Primeiro uso (Modo Ponto de Acesso - WiFiManager)
Se for a primeira vez rodando o firmware, a placa criará uma rede Wi-Fi temporária.
1. Pelo celular ou notebook, conecte-se à rede Wi-Fi chamada **`access-control-setup-bio`** (senha: `admin123`).
2. Uma página de configuração abrirá automaticamente (ou acesse `http://192.168.4.1`).
3. Insira o SSID e Senha da sua rede local.
4. Preencha os campos com o IP do Broker MQTT e o Secret do dispositivo.
5. Salve. O NodeMCU irá reiniciar.

### B. Conexão bem-sucedida
No Monitor Serial, os logs em sequência devem ser:

```text
[WiFi] Conectado IP: 192.168.X.X
[MQTT] Conectado e configurado.
```

## 4. Teste Físico (Detecção do Dedo)

1. Encoste um dedo no sensor biométrico ZW-111.
2. O pino `TouchOut` (conectado no D5) deve ir para nível ALTO (HIGH).
3. O firmware "acorda" o processo de leitura e tenta localizar o ID da digital.
4. Você deve visualizar no terminal algo como:
   ```text
   [BIO] Access-attempt -> ID: 5
   ```
   *(Nota: Se o dedo não estiver previamente cadastrado no sensor, a leitura pode falhar ou não retornar um ID válido, dependendo de como o template interno está gerido).*

## 5. Validação da Comunicação no Broker MQTT

Para ter certeza de que o servidor e a placa estão conversando adequadamente, você pode usar um utilitário como o **MQTT Explorer** (com interface gráfica) ou rodar o comando abaixo no terminal caso tenha o **mosquitto-clients** instalado:

```bash
# Substitua o IP pelo endereço do seu broker MQTT local
mosquitto_sub -h 192.168.0.121 -p 1883 -t "door/#" -v
```

Ao encostar o dedo no sensor, você deve imediatamente receber uma mensagem JSON no tópico MQTT:

**Tópico recebido:**
`door/esp8266-bio-A1B2C3D4E5F6/access-attempt`

**Payload:**
```json
{
  "credentialType": "BIOMETRICS",
  "credentialValue": "5",
  "deviceSecret": "Zx9kPq2mRn7vWj4tYb8cLe"
}
```

## 6. Troubleshooting (Solução de Problemas)

* **Monitor Serial imprimindo caracteres "estranhos" (ex: `2ol{`):**
  Isso é o ESP8266 em estado de Boot Loop. Verifique se você realmente alterou o pino do TouchOut de `D4` para `D5`. O pino D4 não pode ter carga forçada (LOW/HIGH por dispositivos externos) durante a inicialização.
* **Não conecta no MQTT:**
  Verifique se o Broker (ex: Aedes, Mosquitto) está online no mesmo endereço IP configurado pelo WiFiManager e se a porta `1883` não está bloqueada pelo Firewall de onde o Broker está instalado.
* **Sensor não detecta o dedo (TouchOut não dispara):**
  Assegure-se de que o **PIN1 (V_Touch)** do sensor ZW-111 está corretamente ligado aos **3.3V** da placa NodeMCU. Sem alimentar esse pino, o sistema capacitivo do sensor não funciona.