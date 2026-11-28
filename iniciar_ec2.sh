#!/usr/bin/env bash
set -euo pipefail

REPOSITORIO_PADRAO="https://github.com/peak-stack-project/peak-stack.git"
BRANCH="main"
PASTA_PROJETO="$HOME/peak-stack"

perguntar() {
    local variavel="$1" mensagem="$2" padrao="$3" oculto="${4:-nao}" valor

    if [[ "$oculto" == "sim" ]]; then
        read -rsp "$mensagem [$padrao]: " valor
        printf '\n'
    else
        read -rp "$mensagem [$padrao]: " valor
    fi

    printf -v "$variavel" '%s' "${valor:-$padrao}"
}

validar_versao() {
    [[ "$1" =~ ^(latest|v[0-9]+)$ ]] || {
        echo "Use latest ou uma versão como v8."
        exit 1
    }
}

salvar_linha_env() {
    local chave="$1" valor="$2"
    valor=${valor//\\/\\\\}
    valor=${valor//\"/\\\"}
    printf '%s="%s"\n' "$chave" "$valor"
}

parar_anterior() {
    local nome="$1"
    local arquivo_pid="logs/$nome.pid"

    if [[ -f "$arquivo_pid" ]] && kill -0 "$(<"$arquivo_pid")" 2>/dev/null; then
        kill "$(<"$arquivo_pid")"
    fi
    rm -f "$arquivo_pid"
}

iniciar_python() {
    local nome="$1" arquivo="$2"
    parar_anterior "$nome"
    nohup .venv/bin/python -u "$arquivo" >"logs/$nome.log" 2>&1 &
    echo $! >"logs/$nome.pid"
    echo "$nome iniciado. Log: logs/$nome.log"
}

iniciar_java() {
    local arquivo_jar="$1"
    parar_anterior "rede"
    nohup env \
        DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_NAME="$DB_NAME" \
        DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" INTERVALO_SEGUNDOS=10 \
        java -jar "$arquivo_jar" >"logs/rede.log" 2>&1 &
    echo $! >"logs/rede.pid"
    echo "Captura de rede iniciada. Log: logs/rede.log"
}

echo "=== Inicializador PeakStack ==="
REPOSITORIO="$REPOSITORIO_PADRAO"
perguntar VERSAO_BANCO "Versão da imagem do banco" "v8"
perguntar VERSAO_SITE "Versão da imagem do site" "v9"
validar_versao "$VERSAO_BANCO"
validar_versao "$VERSAO_SITE"

echo "[1/6] Instalando dependências da EC2..."
sudo apt-get update -y
sudo apt-get install -y git docker.io docker-compose-v2 python3-venv python3-pip default-jre-headless unzip
sudo systemctl enable --now docker

echo "[2/6] Baixando o repositório..."
if [[ ! -d "$PASTA_PROJETO/.git" ]]; then
    git clone --branch "$BRANCH" "$REPOSITORIO" "$PASTA_PROJETO"
else
    cd "$PASTA_PROJETO"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull --ff-only origin "$BRANCH"
fi
cd "$PASTA_PROJETO"

echo "[3/6] Preenchendo variáveis do Python..."
perguntar DB_USER "Usuário do MySQL" "peakstack"
perguntar DB_PASSWORD "Senha do MySQL" "urubu100" sim
perguntar MYSQL_ROOT_PASSWORD "Senha root do MySQL" "urubu100" sim
perguntar DB_HOST "Host do MySQL para Python e Java" "127.0.0.1"
perguntar DB_PORT "Porta do MySQL" "3306"
perguntar DB_NAME "Nome do banco" "db_peakstack"
perguntar MAC_ADDRESS "MAC cadastrado da EC2" ""
perguntar EC2_IMDS_URL "URL IMDS da EC2" "http://169.254.169.254/latest"
perguntar SLACK_BOT_TOKEN "Token do bot Slack" "" sim

[[ -n "$MAC_ADDRESS" ]] || { echo "MAC_ADDRESS é obrigatório."; exit 1; }
[[ -n "$SLACK_BOT_TOKEN" ]] || { echo "SLACK_BOT_TOKEN é obrigatório."; exit 1; }
[[ "$DB_USER" != "root" ]] || { echo "Use um usuário comum, como peakstack. O MySQL não aceita root nesse campo."; exit 1; }

{
    salvar_linha_env DB_USER "$DB_USER"
    salvar_linha_env DB_PASSWORD "$DB_PASSWORD"
    salvar_linha_env DB_HOST "$DB_HOST"
    salvar_linha_env DB_PORT "$DB_PORT"
    salvar_linha_env DB_NAME "$DB_NAME"
    salvar_linha_env MAC_ADDRESS "$MAC_ADDRESS"
    salvar_linha_env EC2_IMDS_URL "$EC2_IMDS_URL"
    salvar_linha_env SLACK_BOT_TOKEN "$SLACK_BOT_TOKEN"
} > Python/.env

{
    salvar_linha_env AMBIENTE_PROCESSO "desenvolvimento"
    salvar_linha_env APP_HOST "0.0.0.0"
    salvar_linha_env APP_PORT "3333"
    salvar_linha_env DB_DATABASE "$DB_NAME"
    salvar_linha_env DB_USER "$DB_USER"
    salvar_linha_env DB_PASSWORD "$DB_PASSWORD"
    salvar_linha_env MYSQL_ROOT_PASSWORD "$MYSQL_ROOT_PASSWORD"
} > "Site Institucional/.env.dev"
chmod 600 Python/.env "Site Institucional/.env.dev"

echo "[4/6] Subindo banco e site..."
ARQUIVO_COMPOSE_VERSAO=$(mktemp)
trap 'rm -f "$ARQUIVO_COMPOSE_VERSAO"' EXIT
cat > "$ARQUIVO_COMPOSE_VERSAO" <<EOF
services:
  banco:
    image: mickaelarodrigues/meu_bd:$VERSAO_BANCO
  site:
    image: mickaelarodrigues/meu_site:$VERSAO_SITE
EOF

COMPOSE=(sudo docker compose --env-file "Site Institucional/.env.dev" -f compose.yaml -f "$ARQUIVO_COMPOSE_VERSAO")
"${COMPOSE[@]}" up -d --pull always --wait --wait-timeout 120

echo "[5/6] Instalando dependências do Python..."
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install mysql-connector-python psutil python-dotenv rich slack-sdk boto3

echo "[6/6] Iniciando capturas Python e Java..."
mkdir -p logs
iniciar_python "componentes" "Python/Captura_PeakStack.py"
iniciar_python "ec2" "Python/Captura_EC2.py"

if [[ ! -d "Jar captura peakstack/PeakStack" ]]; then
    unzip -q -o "Jar captura peakstack/PeakStack.zip" -d "Jar captura peakstack"
fi

ARQUIVO_JAR="Jar captura peakstack/PeakStack/target/peakstack-captura.jar"
[[ -f "$ARQUIVO_JAR" ]] || { echo "JAR não encontrado: $ARQUIVO_JAR"; exit 1; }
iniciar_java "$ARQUIVO_JAR"

"${COMPOSE[@]}" ps
echo "Pronto. Site: http://IP_DA_EC2:3333"
