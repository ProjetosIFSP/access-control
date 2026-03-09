# INFRA — Implementações Realizadas

## INFRA-001 — Docker Compose (local e produção)

**Status:** ✅ Concluído

---

### Arquivos

| Arquivo | Ambiente | Descrição |
|---------|----------|-----------|
| `docker-compose.yml` | Base | Configurações compartilhadas entre ambientes |
| `docker-compose.local.yml` | Desenvolvimento | Overrides para rodar localmente (portas expostas, volumes) |
| `docker-compose.prod.yml` | Produção | Overrides para produção (sem volumes de dev, restart: always) |

---

### Serviços

| Serviço | Imagem | Porta | Descrição |
|---------|--------|-------|-----------|
| `postgres` | `postgres:16-alpine` | 5432 | Banco de dados PostgreSQL |
| `server` | Build local / GHCR | 3000 | Backend API (Fastify) |
| `iot` | Build local / GHCR | 1883, 9001 | Broker MQTT (Aedes) |
| `app` | Build local / GHCR | 80 | Frontend (Nginx servindo build Vite) |

---

### Como usar localmente

```bash
# Subir apenas o banco (para dev com hot-reload local)
docker-compose -f docker-compose.local.yml up -d postgres

# Subir tudo localmente
docker-compose -f docker-compose.local.yml up -d

# Ver logs
docker-compose -f docker-compose.local.yml logs -f server
```

---

### Dockerfiles

| Arquivo | Descrição |
|---------|-----------|
| `server/Dockerfile` | Multi-stage build: instala deps, compila TypeScript, roda `node dist/` |
| `iot/Dockerfile.mqtt` | Similar ao server — compila e roda o broker |
| `app/Dockerfile` | Stage 1: `npm run build` (Vite); Stage 2: Nginx servindo `dist/` |

---

## INFRA-002 — CI/CD via GitHub Actions + GHCR

**Status:** ✅ Concluído

---

### Workflow

**Localização:** `.github/workflows/`

**Trigger:** Push para branch `main`

**O que faz:**
1. Checkout do repositório
2. Login no GitHub Container Registry (GHCR) com `GITHUB_TOKEN`
3. Build das imagens Docker para cada serviço (`server`, `iot`, `app`)
4. Push das imagens com duas tags:
   - `latest` — sempre aponta para o build mais recente da `main`
   - `sha-XXXXXXX` — tag imutável com os primeiros 7 caracteres do SHA do commit

---

### Imagens publicadas

```
ghcr.io/[owner]/[repo]/server:latest
ghcr.io/[owner]/[repo]/server:sha-abc1234

ghcr.io/[owner]/[repo]/iot:latest
ghcr.io/[owner]/[repo]/iot:sha-abc1234

ghcr.io/[owner]/[repo]/app:latest
ghcr.io/[owner]/[repo]/app:sha-abc1234
```

---

### Vantagens da abordagem

- **`latest`** — fácil de usar no servidor de produção; sempre reflete o estado da `main`
- **`sha-XXXXXXX`** — permite rollback para qualquer commit anterior com precisão
- **GHCR** — integrado ao GitHub sem necessidade de conta em registry externo (Docker Hub, etc.)
- **`GITHUB_TOKEN`** — sem necessidade de secrets manuais para autenticação no registry

---

## INFRA-003 — Script de Deploy Automatizado

**Status:** ✅ Concluído

---

### Arquivo: `deploy.sh` (raiz do projeto)

**O que faz:**
1. Faz login no GHCR (requer `GITHUB_TOKEN` ou `CR_PAT` no ambiente do servidor)
2. Pull das imagens `latest` de todos os serviços
3. Executa `docker compose -f docker-compose.prod.yml up -d` para restartar com as novas imagens
4. Opcionalmente executa migrações de banco após o restart

**Como usar no servidor de produção:**
```bash
# Clonar/atualizar o repositório no servidor (apenas docker-compose.prod.yml é necessário)
git pull

# Executar o deploy
chmod +x deploy.sh
./deploy.sh
```

---

### Fluxo completo de deploy

```
Desenvolvedor faz push para main
    │
    └─► GitHub Actions dispara
            │
            └─► Build das 3 imagens Docker
                    │
                    └─► Push para GHCR (tags: latest + sha-XXXXXXX)
                                │
                                └─► Servidor de produção (manual ou webhook)
                                        │
                                        └─► ./deploy.sh
                                                │
                                                └─► docker compose pull
                                                        │
                                                        └─► docker compose up -d
```

---

## INFRA-004 — Monitoramento de Logs em Produção

**Status:** ⬜ Não iniciado

---

### Situação atual

Os serviços emitem logs estruturados (Pino no `server` e no `iot`) e logs do Nginx no `app`. Em produção, esses logs são visíveis apenas via `docker compose logs`, sem persistência estruturada ou alertas.

---

### O que precisa ser implementado

**Opção A — Loki + Grafana (recomendada para o TCC):**
- Loki coleta e indexa os logs dos containers Docker
- Grafana oferece interface de consulta e dashboards
- Driver de log `loki` no Docker Compose envia logs automaticamente
- Stack leve, open-source, compatível com VPS modesto

**Opção B — ELK Stack (Elasticsearch + Logstash + Kibana):**
- Mais completa, mas muito mais pesada para um VPS pequeno
- Não recomendada para o escopo do TCC

**Opção C — Apenas `docker compose logs` + rotação de arquivos:**
- Mais simples — configurar `logging.max-size` e `logging.max-file` no Compose
- Sem dashboard, mas suficiente para demonstração no TCC

---

### Configuração mínima (Opção C — mais viável para o TCC)

Adicionar ao `docker-compose.prod.yml` para cada serviço:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

Isso limita o uso de disco dos logs a 30MB por serviço (3 arquivos × 10MB) com rotação automática.

---

## Variáveis de Ambiente em Produção

As variáveis sensíveis (credenciais do banco, secrets de autenticação) são gerenciadas via arquivo `.env` no servidor, **nunca commitado no repositório**.

O arquivo `.env.example` na raiz do projeto documenta todas as variáveis necessárias com valores de placeholder.

**Variáveis principais:**

| Variável | Serviço | Descrição |
|----------|---------|-----------|
| `DATABASE_URL` | server | URL de conexão PostgreSQL |
| `BETTER_AUTH_SECRET` | server | Secret para assinar tokens de sessão |
| `BACKEND_URL` | iot | URL do backend acessível pelo broker |
| `VITE_API_URL` | app (build) | URL da API acessível pelo browser |
| `POSTGRES_PASSWORD` | postgres | Senha do banco |