# Correção: Security Level 0 para PS_UpChar (Template Upload)

## Problema Identificado

Durante os testes de enrollment no terminal físico, o firmware estava retornando **35** no log serial quando tentava exportar o template biométrico via `finger.getModel()`:

```
[BIO] Primeira passagem capturada.
[BIO] Segunda passagem capturada.
[BIO] getModel(buffer 1) retornou: 35
```

O manual do sensor ZW-111 (Fingerprint_module_manual_V1.1.pdf) revelou:
- **Error code 0x23** = "The fingerprint template is empty"
- O **registrador 7** controla o encryption level.
- **PS_UpChar (upload de template)** só é suportado quando o encryption level está em **0**.
- Levels 1+ bloqueiam upload/download de templates.

## Raiz do Problema

Na função `setupFingerprint()`, o código estava usando a API da biblioteca Adafruit para alterar o registro errado. O manual do ZW-111 indica que o encryption level fica no **registrador 7**, não no registrador usado pela abstração anterior.

## Solução Implementada

### Solução: Escrever o registrador 7 diretamente

Adicionado na função `setupFingerprint()` (após `getParameters()`):

```cpp
uint8_t securityResult = writeEncryptionLevelRaw(0);
if (securityResult == FINGERPRINT_OK) {
  Serial.println("[BIO] Encryption level configurado para 0 via PS_WriteReg(reg 7).");
} else {
  Serial.print("[BIO] Aviso: PS_WriteReg(reg 7, 0) retornou ");
  Serial.print(securityResult);
  Serial.println(" (continuando, pois o sensor pode já estar em level 0).");
}
delay(100);
```

**Resultado Observado:** a biblioteca Adafruit não estava alterando o registrador correto.

**Interpretação:** 
- O manual do ZW-111 usa o **registrador 7** para o encryption level.
- A função `setSecurityLevel()` da biblioteca Adafruit escreve em outro registrador e não resolve esse sensor.

### Ajuste atual

O firmware agora:
1. Escreve o registrador 7 diretamente via `PS_WriteReg`
2. Usa valor `0` para habilitar `PS_UpChar`
3. Lê novamente os parâmetros do sensor para confirmar o estado real

Se `finger.security_level` continuar diferente de 0, o sensor pode estar com configuração travada ou com comportamento de clone incompatível com a instrução. Nesse caso, a próxima etapa é testar a resposta do `PS_WriteReg` no serial e comparar com o manual.

## Arquivos Modificados

2. **core/biometry-terminal/firmware-biometry-terminal.ino** (linha ~425)
3. **core/biometry-terminal/zw111_basic/zw111_basic.ino** (linha ~425)

Ambos os arquivos agora programam o encryption level pelo registrador correto.

## Próximos Passos

### 1. Recompilar o Firmware

Abra o Arduino IDE:
```bash
# Linux/Mac
arduino-cli compile --fqbn esp8266:esp8266:nodemcu core/biometry-terminal/firmware-biometry-terminal.ino

# Ou via GUI do Arduino IDE:
# File → Open → core/biometry-terminal/firmware-biometry-terminal.ino
# Sketch → Compile
```

### 2. Fazer Upload para a NodeMCU

```bash
# Via arduino-cli
arduino-cli upload -p /dev/ttyUSB0 --fqbn esp8266:esp8266:nodemcu core/biometry-terminal/

# Ou via Arduino IDE:
# Tools → Board: "NodeMCU 1.0 (ESP8266 12E Module)"
# Tools → Port: (selecionar porta USB)
# Sketch → Upload
```

### 3. Testar o Fluxo Corrigido

Após upload bem-sucedido:

1. Abra o monitor serial (baudrate 115200)
2. Acione um novo enrollment via API:
   ```bash
   POST /users/{userId}/fingerprints/enroll-request
   {
     "finger": "LEFT_THUMB",
     "controllerId": "esp8266-bio-XXXXX"
   }
   ```
3. Observe os logs do terminal:
   ```
   [MQTT] Enter enrollment: <enrollmentId>
   [BIO] Primeira passagem capturada.          # ✓ Primeiro toque
   [BIO] Segunda passagem capturada.           # ✓ Segundo toque
   [BIO] getModel OK                           # ✓ ANTES retornava error 35
   [BIO] Template capturado: <hex_string>      # ✓ Extração bem-sucedida
   [MQTT] Published enrollment-result: {..., status: "SUCCESS"}
   ```

## Validação da Correção

**Esperado após o upload:**
- Logs mostram `Encryption level configurado para 0 via PS_WriteReg(reg 7).`
- `getParameters()` passa a imprimir `Nível de segurança: 0`
- `getModel()` deixa de retornar `35` e o enrollment publica o `template`

**Se ainda falhar com error 35:**
- Pode ser que o sensor NÃO esteja em security level 0 de fábrica
- Neste caso, veja a seção "Troubleshooting" abaixo

## Troubleshooting

### Se `getModel()` retornar 35 após esta correção:

**Opção 1: Reset de Fábrica do Sensor**
```
Alguns sensores ZW-111 podem vir com security level > 0 travado. Você pode precisar:
1. Resetar o sensor via comando UART (ver manual seção "Reset", opcode 0x14)
2. Ou usar a biblioteca ZW111.cpp alternativa que envia comandos UART brutos
```

**Opção 2: Usar ZW111.cpp (bypass da Adafruit_Fingerprint)**
```cpp
// Em vez de usar Adafruit_Fingerprint, usar a classe ZW111 nativa:
// #include "zw111_basic/ZW111.h"
// ZW111 finger(&fingerSerial);
// Isso evita limitações da biblioteca Adafruit para o ZW-111
```

**Opção 3: Alternar Buffer de Upload**
```
Em alguns ZW-111, o template gerado pode ficar acessível apenas no outro buffer.
O firmware agora tenta `PS_UpChar` nos buffers 1 e 2 antes de falhar.
```

**Opção 4: Armazenar Template Localmente**
```
Se PS_UpChar continuar não funcionando (mesmo com security level 0):
1. Armazenar o template em flash do ESP8266 em vez de extrair via UART
2. Usar ID local do template em vez de template hexadecimal
3. Sincronizar apenas o ID do template entre dispositivos (não o template em si)
```

## Referências

- Manual do Sensor: `docs/Fingerprint_module_manual_V1.1.pdf`
  - Seção "System Parameters" → registrador 7: encryption level
  - Seção 3.3.1.8 "PS_UpChar" (página ~23): "This function is supported when the encryption level is set to 0"
  - Error codes: 0x23 = "The fingerprint template is empty"
- Biblioteca: `Adafruit_Fingerprint.h`
  - Função: `uint8_t setSecurityLevel(uint8_t level);` (linha ~456 do .cpp)

## Histórico de Debug

| Tentativa | Error | Causa | Solução |
|-----------|-------|-------|---------|
| 1 | 35 decimal / 0x23 | Buffer de template vazio | Tentar `PS_UpChar` nos buffers 1 e 2 |
| 2 | 0x1B (27) | API Adafruit alterava o registrador errado | Usar pacote UART bruto para o registrador correto |
| 3 | ⏳ | Testando registrador 7 e fallback de buffer | Se ainda retornar 35: validar sensor/clone/trava de firmware |
