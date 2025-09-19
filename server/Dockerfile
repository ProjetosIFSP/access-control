# Estágio 1: 'base' - Configurações comuns e instalação de dependências
# Usamos um estágio base para evitar repetição.
FROM node:24-alpine AS base
WORKDIR /app
# Copia os arquivos de definição de pacotes primeiro para aproveitar o cache do Docker.
COPY package*.json ./

# Estágio 2: 'deps' - Instala todas as dependências (incluindo devDependencies)
# Este estágio é usado para o build, onde podem ser necessários pacotes de desenvolvimento.
FROM base AS deps
RUN npm ci

# Estágio 3: 'builder' - Compila a aplicação (se usar TypeScript)
# Copia as dependências e o código-fonte, depois executa o script de build.
FROM deps AS builder
COPY . .
# Se seu projeto for TypeScript, você provavelmente terá um comando 'build'.
# Se for JavaScript puro, pode remover esta linha.
RUN npm run build

# Estágio 4: 'runner' - Estágio final de produção
# Começamos com uma imagem limpa para ter uma imagem final enxuta.
FROM node:24-alpine AS runner
WORKDIR /app

# Define o ambiente para produção.
ENV NODE_ENV=production

# Cria um grupo e um usuário com privilégios reduzidos por segurança.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia os arquivos de definição de pacotes do estágio 'base'.
COPY --from=base package*.json ./

# Instala SOMENTE as dependências de produção.
RUN npm ci --omit=dev && npm cache clean --force

# Copia o código compilado do estágio 'builder'.
# Assumindo que o build gera uma pasta 'dist'. Altere se for diferente.
COPY --from=builder /app/dist ./dist

# Copia a pasta com os arquivos de migração do Drizzle.
# É importante para executar migrações no ambiente de produção.
COPY --from=builder /app/drizzle ./drizzle

# Define o usuário não-root como o usuário padrão para executar o container.
USER appuser

# Expõe a porta em que a aplicação Fastify irá rodar.
EXPOSE 3000

# Comando para iniciar a aplicação.
# O '-H 0.0.0.0' é crucial para que a aplicação seja acessível de fora do container.
CMD ["node", "dist/server.js", "-H", "0.0.0.0", "-p", "3000"]
