#!/usr/bin/env bash
# Na EC2 Ubuntu/Linux: bash iniciar.sh
# Mantenha este terminal aberto. Ctrl+C encerra os três processos.
set -u

PASTA_PROJETO="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PASTA_LOGS="$PASTA_PROJETO/logs"
PIDS=()

erro() {
    printf 'Erro: %s\n' "$1" >&2
    exit 1
}

# Usa o ambiente virtual do projeto, se existir; caso contrário, python3.
PYTHON="python3"
if [[ -x "$PASTA_PROJETO/.venv/bin/python" ]]; then
    PYTHON="$PASTA_PROJETO/.venv/bin/python"
elif [[ -x "$PASTA_PROJETO/Python/.venv/bin/python" ]]; then
    PYTHON="$PASTA_PROJETO/Python/.venv/bin/python"
fi

command -v "$PYTHON" >/dev/null 2>&1 || erro "Instale o Python 3 e as dependências dos capturadores."
command -v node >/dev/null 2>&1 || erro "Instale o Node.js 20 ou superior."
command -v flock >/dev/null 2>&1 || erro "O comando flock é necessário (pacote util-linux no Ubuntu)."
[[ -f "$PASTA_PROJETO/Python/.env" ]] || erro "Configure Python/.env com MySQL, MAC e Slack."
[[ -f "$PASTA_PROJETO/Site Institucional/.env.dev" ]] || erro "Configure Site Institucional/.env.dev com os dados do servidor e do MySQL."
[[ -d "$PASTA_PROJETO/Site Institucional/node_modules" ]] || erro "Execute npm install dentro de Site Institucional antes de iniciar."

mkdir -p -- "$PASTA_LOGS" || erro "Não foi possível criar a pasta de logs."
exec 9>"$PASTA_LOGS/iniciar.lock"
flock -n 9 || erro "Já existe uma execução deste iniciar.sh."

encerrar() {
    trap - INT TERM HUP
    printf '\nEncerrando os processos iniciados por este script...\n'
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    for pid in "${PIDS[@]}"; do
        wait "$pid" 2>/dev/null || true
    done
}

trap encerrar EXIT
trap 'exit 0' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

(
    cd -- "$PASTA_PROJETO/Python" || exit 1
    exec "$PYTHON" -u Captura_PeakStack.py
) >>"$PASTA_LOGS/componentes.log" 2>&1 &
PIDS+=("$!")

(
    cd -- "$PASTA_PROJETO/Python" || exit 1
    exec "$PYTHON" -u Captura_EC2.py
) >>"$PASTA_LOGS/ec2.log" 2>&1 &
PIDS+=("$!")

(
    cd -- "$PASTA_PROJETO/Site Institucional" || exit 1
    exec node app.js
) >>"$PASTA_LOGS/node.log" 2>&1 &
PIDS+=("$!")

printf 'Comandos de captura e servidor Node iniciados.\n'
printf 'Logs em: %s\n' "$PASTA_LOGS"
printf 'Para acompanhar: tail -f "%s"/*.log\n' "$PASTA_LOGS"
printf 'Mantenha este terminal aberto. Pressione Ctrl+C para encerrar tudo.\n'

# Se um processo encerrar, informa a falha e fecha os demais.
wait -n "${PIDS[@]}"
printf '\nUm dos processos encerrou. Consulte componentes.log, ec2.log e node.log.\n' >&2
exit 1
