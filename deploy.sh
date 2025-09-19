set -e

REPO_OWNER="ProjetosIFSP"

IMAGE_WEB="access-control-web"
IMAGE_SERVER="access-control-server"
IMAGE_IOT="access-control-iot"

if [ -z "$GHCR_PAT" ]; then
  echo "Erro: A variável de ambiente GHCR_PAT não está definida."
  echo "Por favor, exporte seu GitHub Personal Access Token antes de executar o script:"
  echo "export GHCR_PAT=\"seu_token_aqui\""
  exit 1
fi

echo "=> Autenticando no GitHub Container Registry..."
# O nome de usuário pode ser qualquer string, o token é o que importa.
echo $GHCR_PAT | docker login ghcr.io -u $REPO_OWNER --password-stdin

echo "=> Baixando as imagens mais recentes..."
docker pull ghcr.io/$REPO_OWNER/$IMAGE_WEB:latest
docker pull ghcr.io/$REPO_OWNER/$IMAGE_SERVER:latest
docker pull ghcr.io/$REPO_OWNER/$IMAGE_IOT:latest

echo "=> Parando e removendo os contêineres antigos (se existirem)..."
docker-compose -f docker-compose.yml down

echo "=> Iniciando os serviços com as novas imagens..."
docker-compose -f docker-compose.yml up -d

echo "=> Limpando imagens antigas e não utilizadas..."
docker image prune -f

echo "✅ Deploy concluído com sucesso!"
