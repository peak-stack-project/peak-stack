#!/usr/bin/env bash
# Execute na EC2 Ubuntu, na branch que deseja testar.
set -Eeuo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
PASTA_PROJETO="$PWD"
ENV_SITE="Site Institucional/.env.dev"
PYTHON=".venv/bin/python"
PIDS=()

erro() {
    printf 'Erro: %s\n' "$1" >&2
    exit 1
}

encerrar_capturas() {
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
    done
}

[[ -f "$ENV_SITE" ]] || erro "Copie Site Institucional/.env.example para $ENV_SITE e preencha os dados do MySQL."
[[ -f Python/.env ]] || erro "Configure Python/.env com os dados do MySQL, o MAC cadastrado e o token do Slack."

mkdir -p logs
exec 9>logs/iniciar.lock
flock -n 9 || erro "Já existe um iniciar.sh rodando neste projeto."
trap encerrar_capturas EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '[1/5] Preparando o ambiente Python...\n'
if [[ ! -x "$PYTHON" ]]; then
    python3 -m venv .venv || erro "Instale python3-venv na EC2."
fi
"$PYTHON" -m pip install -r Python/requirements.txt

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
"$PYTHON" -u Python/Captura_PeakStack.py >>logs/componentes.log 2>&1 &
PIDS+=("$!")
"$PYTHON" -u Python/Captura_EC2.py >>logs/ec2.log 2>&1 &
PIDS+=("$!")

printf '[5/5] Estado dos contêineres\n'
"${compose[@]}" ps
printf 'Logs em %s/logs. Ctrl+C para os capturadores.\n' "$PASTA_PROJETO"

wait -n "${PIDS[@]}" || true
erro "Um capturador parou. Confira logs/componentes.log e logs/ec2.log."
