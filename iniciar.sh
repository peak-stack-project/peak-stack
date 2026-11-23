#!/usr/bin/env bash
# Execute na EC2 Ubuntu, na branch que deseja testar.
set -Eeuo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
PASTA_PROJETO="$PWD"
ENV_SITE="Site Institucional/.env.dev"
PYTHON=".venv/bin/python"

erro() {
    printf 'Erro: %s\n' "$1" >&2
    exit 1
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

[[ -f "$ENV_SITE" ]] || erro "Copie Site Institucional/.env.example para $ENV_SITE e preencha os dados do MySQL."
[[ -f Python/.env ]] || erro "Configure Python/.env com os dados do MySQL, o MAC cadastrado e o token do Slack."

mkdir -p logs
exec 9>logs/iniciar.lock
flock -n 9 || erro "Já existe um iniciar.sh rodando neste projeto."

printf '[1/5] Preparando o ambiente Python...\n'
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

printf '[2/5] Subindo o banco e o site da branch %s...\n' "$(git branch --show-current)"
if docker info >/dev/null 2>&1; then
    docker_cli=(docker)
else
    docker_cli=(sudo docker)
fi
compose=("${docker_cli[@]}" compose --env-file "$ENV_SITE")
"${compose[@]}" version >/dev/null || erro "Instale o Docker Compose v2 na EC2."
"${compose[@]}" up -d --pull always --wait --wait-timeout 120

printf '[3/5] Conferindo as tabelas de custos...\n'
"${compose[@]}" exec -T banco sh -c '
    export MYSQL_PWD="$MYSQL_PASSWORD"
    exec mysql -h 127.0.0.1 -u "$MYSQL_USER" "$MYSQL_DATABASE" \
        -e "SELECT 1 FROM ec2_captura LIMIT 0; SELECT 1 FROM ec2_custo_tarifa LIMIT 0; SELECT 1 FROM ec2_custo_intervalo LIMIT 0;"
' || erro "Confira se o banco tem as tabelas de captura e custos do scriptPeakStack.sql."

printf '[4/5] Iniciando as duas capturas...\n'
iniciar_captura Captura_PeakStack.py componentes
iniciar_captura Captura_EC2.py ec2

printf '[5/5] Estado dos contêineres\n'
"${compose[@]}" ps
printf 'Capturadores em segundo plano. Logs em %s/logs.\n' "$PASTA_PROJETO"
