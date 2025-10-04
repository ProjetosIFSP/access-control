# Estágio 1: 'deps' - Instala as dependências com cache otimizado
# Este estágio foca apenas em instalar os pacotes Node.js. Como o package.json muda com menos frequência
# que o código-fonte, o Docker reutilizará o cache deste estágio, acelerando builds futuros.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Estágio 2: 'builder' - Compila a aplicação React com Vite
# Aqui, copiamos as dependências já instaladas e o código-fonte para gerar os arquivos
# estáticos da aplicação, que serão colocados na pasta '/app/dist'.
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Estágio 3: 'runner' - Serve a aplicação com Nginx
# Este é o estágio final, que cria a imagem de produção. Usamos uma imagem leve do Nginx,
# que é um servidor web de alta performance, ideal para servir os arquivos estáticos
# gerados pelo Vite no estágio anterior.
FROM nginx:stable-perl AS runner
# Copia apenas os arquivos compilados (da pasta 'dist') do estágio 'builder' para a pasta
# padrão do Nginx que serve conteúdo web.
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia o arquivo de configuração customizado do Nginx. Este passo é crucial para o funcionamento
# de Single Page Applications (SPAs), garantindo que o roteamento do React (React Router) funcione.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80, que é a porta padrão do Nginx.
EXPOSE 80

# O comando padrão da imagem Nginx já inicia o servidor, mas o comando abaixo o torna explícito.
# Ele inicia o Nginx em modo 'foreground', o que é a prática recomendada para containers.
CMD ["nginx", "-g", "daemon off;"]