#!/usr/bin/env bash
# Execute na EC2 Ubuntu.
set -Eeuo pipefail

PASTA_SCRIPT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPOSITORIO="https://github.com/peak-stack-project/peak-stack.git"
BRANCH="${1:-feat/custosSistema}"
ENV_SITE="Site Institucional/.env.dev"
ENV_PYTHON="Python/.env"
PYTHON=".venv/bin/python"

erro() {
    printf 'Erro: %s\n' "$1" >&2
    exit 1
}

copiar_env() {
    local destino="$1"
    local modelo="$2"

    if [[ -f "$destino" ]]; then
        return
    fi

    local origem="$PASTA_SCRIPT/$destino"
    if [[ ! -f "$origem" ]]; then
        origem="$modelo"
    fi

    (umask 077; cp -- "$origem" "$destino")
    printf 'Criado %s.\n' "$destino"
}

campo_pendente() {
    local arquivo="$1" chave="$2" exemplo="$3" valor
    valor=$(sed -nE "s/^[[:space:]]*(export[[:space:]]+)?${chave}[[:space:]]*=[[:space:]]*//p" "$arquivo" | tail -n 1)
    valor=$(printf '%s\n' "$valor" | sed -E 's/[[:space:]]+#.*$//; s/[[:space:]]+$//')
    [[ -z "$valor" || "$valor" == \#* || "$valor" == "''" || "$valor" == '""' ||
        "$valor" == "$exemplo" || "$valor" == "'$exemplo'" || "$valor" == "\"$exemplo\"" ]]
}

salvar_campo() {
    local arquivo="$1" chave="$2" valor="$3" temporario
    temporario=$(mktemp "$arquivo.XXXXXX")
    valor=${valor//\\/\\\\}

    {
        sed -E "/^[[:space:]]*(export[[:space:]]+)?${chave}[[:space:]]*=/d" "$arquivo"
        if [[ "$arquivo" == "$ENV_SITE" ]]; then
            valor=${valor//\"/\\\"}
            valor=${valor//\$/\$\$}
            printf '%s="%s"\n' "$chave" "$valor"
        else
            valor=${valor//\'/\\\'}
            printf "%s='%s'\n" "$chave" "$valor"
        fi
    } >"$temporario"
    mv -- "$temporario" "$arquivo"
}

pedir_campo() {
    local chave="$1" exemplo="$2" mensagem="$3" oculto="$4" arquivo valor
    local -a pendentes=()
    shift 4

    for arquivo in "$@"; do
        if campo_pendente "$arquivo" "$chave" "$exemplo"; then
            pendentes+=("$arquivo")
        fi
    done
    (( ${#pendentes[@]} > 0 )) || return 0

    while true; do
        if [[ "$oculto" == sim ]]; then
            IFS= read -rs -p "$mensagem: " valor || erro "Configuração interrompida."
            printf '\n'
        else
            IFS= read -r -p "$mensagem: " valor || erro "Configuração interrompida."
        fi
        if [[ ! "$valor" =~ [^[:space:]] || "$valor" == "$exemplo" ]]; then
            printf 'Digite um valor válido.\n'
        elif [[ "$chave" != MYSQL_ROOT_PASSWORD && "$valor" == *'${'* ]]; then
            printf 'O Python interpreta a sequência ${ nos arquivos .env. Digite um valor sem essa sequência.\n'
        else
            break
        fi
    done

    for arquivo in "${pendentes[@]}"; do
        salvar_campo "$arquivo" "$chave" "$valor"
    done
}

iniciar_captura() {
    local arquivo="$1"
    local nome_log="$2"
    local trava="logs/$nome_log.lock"

    if ! flock -n "$trava" true; then
        printf '%s já está rodando.\n' "$arquivo"
        return
    fi

    nohup flock -n -F "$trava" "$PYTHON" -u "Python/$arquivo" \
        </dev/null >>"logs/$nome_log.log" 2>&1 9>&- &
    local pid=$!
    sleep 1
    kill -0 "$pid" 2>/dev/null || erro "$arquivo encerrou. Confira logs/$nome_log.log."
    printf '%s iniciado (PID %s).\n' "$arquivo" "$pid"
}

printf '[1/7] Verificando dependências da EC2...\n'
pacotes=()
command -v docker >/dev/null || pacotes+=(docker.io)
docker compose version >/dev/null 2>&1 || pacotes+=(docker-compose-v2)
python3 -m ensurepip --version >/dev/null 2>&1 || pacotes+=(python3-venv)
command -v git >/dev/null || pacotes+=(git)
command -v flock >/dev/null || pacotes+=(util-linux)

if (( ${#pacotes[@]} > 0 )); then
    sudo apt-get update
    sudo apt-get install -y "${pacotes[@]}"
fi

printf '[2/7] Preparando o repositório e os arquivos .env...\n'
PASTA_PROJETO="$HOME/peak-stack"
if [[ -f "$PASTA_SCRIPT/compose.yaml" && -e "$PASTA_SCRIPT/.git" ]]; then
    PASTA_PROJETO="$PASTA_SCRIPT"
elif [[ ! -e "$PASTA_PROJETO/.git" ]]; then
    git clone --branch "$BRANCH" "$REPOSITORIO" "$PASTA_PROJETO"
fi
cd -- "$PASTA_PROJETO"

mkdir -p logs
exec 9>logs/iniciar.lock
flock -n 9 || erro "Já existe um iniciar.sh rodando neste projeto."

copiar_env "$ENV_SITE" "Site Institucional/.env.example"
copiar_env "$ENV_PYTHON" "Python/.env.example"

pedir_campo DB_USER seu_usuario "Usuário do MySQL usado pelo site e pelo Python" nao "$ENV_SITE" "$ENV_PYTHON"
pedir_campo DB_PASSWORD sua_senha "Senha desse usuário do MySQL" sim "$ENV_SITE" "$ENV_PYTHON"
pedir_campo MYSQL_ROOT_PASSWORD sua_senha_root "Senha do root do MySQL" sim "$ENV_SITE"
pedir_campo MAC_ADDRESS 001122334455 "MAC cadastrado da máquina" nao "$ENV_PYTHON"
pedir_campo SLACK_BOT_TOKEN xoxb-seu-token "Token do bot do Slack" sim "$ENV_PYTHON"

printf '[3/7] Preparando o ambiente Python...\n'
if [[ ! -x "$PYTHON" ]]; then
    python3 -m venv .venv || erro "Instale python3-venv na EC2."
fi
# O pacote antigo tem o mesmo módulo mysql.connector do conector atual.
if "$PYTHON" -m pip show mysql-connector >/dev/null 2>&1; then
    "$PYTHON" -m pip uninstall -y mysql-connector mysql-connector-python
fi

"$PYTHON" - <<'PY'
from pathlib import Path

original = Path("Python/requirements.txt").read_bytes()
encoding = "utf-16" if original.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig"
requirements = original.decode(encoding).replace("mysql-connector==2.2.9", "mysql-connector-python>=9.5,<10")
Path(".venv/requirements.txt").write_text(requirements, encoding="utf-8")
PY
"$PYTHON" -m pip install -r .venv/requirements.txt

printf '[4/7] Subindo o banco e o site (branch local: %s)...\n' "$(git branch --show-current)"
if docker info >/dev/null 2>&1; then
    docker_cli=(docker)
else
    docker_cli=(sudo docker)
    if ! "${docker_cli[@]}" info >/dev/null 2>&1; then
        sudo systemctl enable --now docker
    fi
fi
compose=("${docker_cli[@]}" compose --env-file "$ENV_SITE")
"${compose[@]}" version >/dev/null || erro "Instale o Docker Compose v2 na EC2."
"${compose[@]}" up -d --pull always --wait --wait-timeout 120

printf '[5/7] Conferindo as tabelas de custos...\n'
"${compose[@]}" exec -T banco sh -c '
    export MYSQL_PWD="$MYSQL_PASSWORD"
    exec mysql -h 127.0.0.1 -u "$MYSQL_USER" "$MYSQL_DATABASE" \
        -e "SELECT 1 FROM ec2_captura LIMIT 0; SELECT 1 FROM ec2_custo_tarifa LIMIT 0; SELECT 1 FROM ec2_custo_intervalo LIMIT 0;"
' || erro "Confira se o banco tem as tabelas de captura e custos do scriptPeakStack.sql."

printf '[6/7] Iniciando as duas capturas...\n'
iniciar_captura Captura_PeakStack.py componentes
iniciar_captura Captura_EC2.py ec2

printf '[7/7] Estado dos contêineres\n'
"${compose[@]}" ps
printf 'Capturadores em segundo plano. Logs em %s/logs.\n' "$PASTA_PROJETO"
