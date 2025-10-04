# 🚀 Deploy
Este guia detalha o processo para implantar a aplicação `access-control` em um servidor de produção.

O projeto utiliza Docker para conterizar os serviços e GitHub Actions para automação de CI (Continuous Integration), construindo e publicando as imagens no GitHub Container Registry (GHCR).

## Inb4: Rodando apenas BD
1. Crie seu arquivo `.env` a partir do `.env.example`
2. Inicie o contêiner do banco de dados com o seguinte comando:

```
docker-compose -f docker-compose.local.yml up -d
```
3.  Agora, o banco de dados PostgreSQL estará rodando e acessível em `localhost:5432`. Sua aplicação backend, rodando localmente na sua máquina, poderá se conectar a ele para executar migrações e outras operações.

## 1. Pré-requisitos do Servidor
Certifique-se de que o seu servidor de produção tenha os seguintes softwares instalados:

- Docker

- Docker Compose

## 2. Configuração Inicial do Servidor
Este passo a passo é necessário apenas na primeira vez que você configurar o ambiente.

### Passo 1: Preparar o Diretório
Crie um diretório para a aplicação no servidor e entre nele.

```
  mkdir ~/access-control && cd ~/access-control
```

### Passo 2: Obter os Arquivos de Deploy
Copie os seguintes arquivos para o diretório que você acabou de criar no servidor:

- `docker-compose.prod.yml`
- `deploy.sh`

### Passo 3: Criar o Arquivo de Variáveis de Ambiente
Crie um arquivo chamado `.env` no mesmo diretório. Este arquivo conterá as credenciais do banco de dados. Substitua os valores de exemplo por suas credenciais seguras.

Arquivo `.env`:

```
# Credenciais do Banco de Dados PostgreSQL
POSTGRES_USER=user_db
POSTGRES_PASSWORD=uma_senha_muito_segura_aqui
POSTGRES_DB=access-control
```

### Passo 4: Criar o GitHub Personal Access Token (PAT)
Para que o script de deploy possa baixar as imagens privadas do GHCR, você precisa de um token de acesso.

1. Vá para a [página de tokens do GitHub](https://github.com/settings/tokens).

1. Clique em "Generate new token" (classic).

1. Dê um nome ao token (ex: `access-control-deploy`).

1. Selecione a permissão `read:packages`.

1. Clique em "Generate token" e copie o token gerado. Você não poderá vê-lo novamente.

## 3. Processo de Deploy (ou Atualização)
Execute este processo toda vez que quiser implantar uma nova versão da aplicação.

### Passo 1: Fazer Push para a Branch `main`
Envie suas alterações para a branch `main` do repositório no GitHub.

```
  git push origin main
```

Isso acionará os workflows do GitHub Actions, que irão construir e publicar as novas imagens Docker no GHCR. Aguarde a finalização bem-sucedida das actions.

### Passo 2: Executar o Script de Deploy no Servidor
1. Conecte-se ao seu servidor via SSH.

1. Navegue até o diretório da aplicação (`~/access-control`).

1. Torne o script de deploy executável (apenas na primeira vez):

```
chmod +x deploy.sh
```

4. Execute o script, passando o seu GitHub PAT como uma variável de ambiente:

```
export GHCR_PAT="seu_token_copiado_do_github"
./deploy.sh
```

O script irá autenticar no GHCR, baixar as imagens mais recentes e reiniciar todos os serviços.

**Verificando os Logs**
Para verificar se os contêineres estão rodando corretamente ou para depurar problemas, use o comando:

```
# Ver logs de todos os serviços
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de um serviço específico (ex: server)
docker-compose -f docker-compose.prod.yml logs -f server
```