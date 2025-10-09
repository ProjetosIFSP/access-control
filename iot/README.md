# IoT Broker (Aedes + Node.js)

Este serviço implementa o broker MQTT responsável por intermediar a comunicação entre os controladores de porta (ESP32) e a API REST. Ele substitui o uso de um broker Mosquitto tradicional, oferecendo lógica customizada em TypeScript/Node.js.

## Visão geral

- **Broker MQTT embutido**: utiliza a biblioteca [Aedes](https://github.com/moscajs/aedes) para aceitar conexões MQTT TCP e MQTT over WebSocket.
- **Integração com o backend**: toda mensagem relevante recebida dos dispositivos resulta em chamadas HTTP (`fetch` via `undici`) para a API (`/iot/devices/...`).
- **Validação de payloads**: contratos de entrada/saída definidos com `zod`, reduzindo risco de dados inválidos chegarem ao backend.
- **Logs estruturados**: `pino` é usado para rastrear eventos de conexão, tentativas de acesso, execução de comandos e falhas.

## Variáveis de ambiente

| Variável | Default | Descrição |
| --- | --- | --- |
| `API_BASE_URL` | `http://server:3333` | URL base da API REST consumida pelo broker. |
| `MQTT_PORT` | `1883` | Porta de escuta para conexões MQTT TCP. |
| `MQTT_WS_PORT` | `9001` | Porta de escuta para MQTT sobre WebSockets. |
| `COMMAND_POLL_INTERVAL` | `1000` | Intervalo (ms) usado para buscar novos comandos REST. |
| `LOG_LEVEL` | `info` | Nível de log aceito pelo Pino. |

Crie um arquivo `.env` no diretório `iot/` para sobrescrever qualquer valor.

## Desenvolvimento local

1. Instale dependências:

   ```bash
   npm install
   ```

2. Inicie o broker em modo watch (requer API acessível na URL configurada):

   ```bash
   npm run dev
   ```

3. Para build/produção:

   ```bash
   npm run build
   npm start
   ```

## Docker

O `Dockerfile.mqtt` realiza um build multi-stage:

1. **deps**: executa `npm ci` para instalar dependências a partir do lockfile.
2. **builder**: copia os fontes e roda `npm run build` (TypeScript -> JavaScript).
3. **runner**: cria imagem enxuta, reinstala apenas dependências de produção (`npm ci --omit=dev`) e executa `node dist/index.js`.

As portas expostas (`1883` e `9001`) devem ser mapeadas externamente conforme necessidade do ambiente. Ajuste variáveis via `.env` ou `docker-compose`.

## Fluxo de mensagens

- `door/{controllerId}/register`: registra controlador e inicia polling de comandos.
- `door/{controllerId}/heartbeat`: mantém sessão ativa e garante polling.
- `door/{controllerId}/status`: atualiza estado da sala/porta.
- `door/{controllerId}/access-attempt`: consulta a API e publica `door/{controllerId}/access-result`.
- `door/{controllerId}/command-result`: reporta execução de comandos enviados pelo backend.

O broker também expõe `door/{controllerId}/command` para entregar novos comandos recebidos via REST (`/commands/pull`).
