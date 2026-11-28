import psutil
import mysql.connector
from rich import print
import time as t
from datetime import datetime
import importlib
import os
from pathlib import Path
from dotenv import load_dotenv
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

load_dotenv(Path(__file__).with_name(".env"), override=True)


def variavel_obrigatoria(nome):
    valor = os.getenv(nome)
    if not valor:
        raise RuntimeError(f"A variável {nome} não foi definida no arquivo .env")
    return valor

INTERVALO = 10

BIBLIOTECAS_PERMITIDAS = {"psutil"}

BYTES = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3, "TB": 1024**4}

NIVEIS = {1: ("Normal", "green"), 2: ("Alerta", "yellow"), 3: ("Crítico", "red")}

LIMITES_PADRAO = {
    "cpu":              ("maior",60, 60, "%"),
    "ram":              ("maior", 60, 80, "%"),
    "disco":            ("maior", 60, 71, "%"),
    "memória restante": ("menor", 40, 15, "%"),
    "pacotes perdidos": ("maior", 50, 500, None),
}

DB = dict(
    user=variavel_obrigatoria("DB_USER"),
    password=variavel_obrigatoria("DB_PASSWORD"),
    host=variavel_obrigatoria("DB_HOST"),
    port=int(variavel_obrigatoria("DB_PORT")),
    database=variavel_obrigatoria("DB_NAME"),
    use_pure=True,
    auth_plugin='mysql_native_password'
)


SLACK_TOKEN = variavel_obrigatoria("SLACK_BOT_TOKEN")
slack_client = WebClient(token=SLACK_TOKEN)

INTERVALO_ALERTAS_SEGUNDOS = 10 
ultimo_alerta = {}

conexoes_anteriores = set()
portas_anteriores = set()
rede_anterior = None
tempo_anterior = None


def coletar_conexoes():
    global conexoes_anteriores, portas_anteriores, rede_anterior, tempo_anterior

    conexoes = psutil.net_connections(kind="inet")

    estados = {}
    portas = set()
    atuais = set()

    for c in conexoes:
        estados[c.status] = estados.get(c.status, 0) + 1
        if c.status == "LISTEN":
            portas.add(c.laddr.port)
        if c.raddr:
            atuais.add((c.laddr.ip, c.laddr.port, c.raddr.ip, c.raddr.port))

    primeiro_ciclo = rede_anterior is None
    agora_t = t.monotonic()
    rede = psutil.net_io_counters()

    download = 0.0
    upload = 0.0
    novas_conexoes = 0
    portas_novas = 0

    if not primeiro_ciclo:
        segundos = max(agora_t - tempo_anterior, 0.001)
        download = max(0.0, (rede.bytes_recv - rede_anterior.bytes_recv) * 8 / 1_000_000 / segundos)
        upload = max(0.0, (rede.bytes_sent - rede_anterior.bytes_sent) * 8 / 1_000_000 / segundos)
        novas_conexoes = len(atuais - conexoes_anteriores)
        portas_novas = len(portas - portas_anteriores)

    conexoes_anteriores = atuais
    portas_anteriores = portas
    rede_anterior = rede
    tempo_anterior = agora_t

    return {
        "total": len(conexoes),
        "established": estados.get("ESTABLISHED", 0),
        "time_wait": estados.get("TIME_WAIT", 0),
        "close_wait": estados.get("CLOSE_WAIT", 0),
        "syn_recv": estados.get("SYN_RECV", 0),
        "novas_conexoes": novas_conexoes,
        "portas_abertas": len(portas),
        "portas_novas": portas_novas,
        "download_mbps": round(download, 2),
        "upload_mbps": round(upload, 2),
        "erros": rede.errin + rede.errout,
        "descartados": rede.dropin + rede.dropout,
    }



SQL_COMPONENTES = """
    SELECT cm.id AS cm_id,
           cm.fk_componentes,
           m.fk_empresa,
           c.nome,
           cc.tipo,
           cc.unidade_medida,
           cc.biblioteca,
           cc.codigo
    FROM maquina m
    JOIN config_maq cm    ON cm.fk_maquina = m.id
    JOIN componentes c          ON c.id = cm.fk_componentes
    JOIN configuracao_comp cc   ON cc.id = c.fk_configuracao_comp
    WHERE UPPER(m.mac_address) = %s
      AND cm.status_config = 'Ativo'
"""


def identificar_tipo(tipo, nome):
    """Usa o tipo cadastrado em configuracao_comp (CPU, RAM, Disco...); se vier vazio, tenta o nome."""
    return (tipo or nome or "").strip().lower()


def nivel_padrao(tipo, valor, unidade):
    """Classifica usando os limites padrão do código (1=Normal, 2=Alerta, 3=Crítico)."""
    regra = LIMITES_PADRAO.get(tipo)
    if regra is None:
        return None 

    sentido, atencao, critico, unidade_exigida = regra
    if unidade_exigida and unidade != unidade_exigida:
        return None  
    if sentido == "maior":
        if valor >= critico:
            return 3
        if valor >= atencao:
            return 2
    else: 
        if valor < critico:
            return 3
        if valor <= atencao:
            return 2
    return 1


def classificar(tipo, valor, unidade, faixas):
    """Usa os limites da empresa (banco); se não houver, cai no padrão do código."""
    if faixas:
        niveis = [
            f["nivel"] for f in faixas
            if (f["valor_min"] is None or valor >= float(f["valor_min"]))
            and (f["valor_max"] is None or valor <= float(f["valor_max"]))
        ]
        if niveis:
            return max(niveis)
    return nivel_padrao(tipo, valor, unidade)


def notificar_slack(cursor, fk_empresa, mac, cm_id, nome_comp, valor, unidade, nivel):
    """Busca o canal cadastrado na tabela slack pela fk_empresa, envia via SDK e grava o log."""
    agora_ts = t.time()
    chave = (cm_id, nivel)

    if agora_ts - ultimo_alerta.get(chave, 0) < INTERVALO_ALERTAS_SEGUNDOS:
        return

    cursor.execute(
        "SELECT canal FROM slack WHERE fk_empresa = %s AND canal IS NOT NULL LIMIT 1",
        (fk_empresa,),
    )
    config_slack = cursor.fetchone()
    if not config_slack or not config_slack.get("canal"):
        print(f"[yellow]Aviso: Empresa {fk_empresa} sem canal cadastrado na tabela slack.[/yellow]")
        return

    canal_id = config_slack["canal"]
    situacao = NIVEIS[nivel][0]
    emoji = "⚠️" if nivel == 2 else "🚨"

    titulo = f"{situacao}: {nome_comp}"
    descricao = f"Máquina {mac} atingiu {valor} {unidade} ({situacao})."

    try:

        slack_client.chat_postMessage(
                    channel=canal_id,
                    text=f"*{emoji} {titulo}*\n{descricao}"
                )
        
        cursor.execute(
                    "INSERT INTO slack (titulo, descricao, canal, fk_empresa) VALUES (%s, %s, %s, %s)",
                    (titulo[:45], descricao[:200], canal_id, fk_empresa),
        )

        ultimo_alerta[chave] = agora_ts
        print(f"[cyan]Notificação enviada ao Slack ({canal_id})[/cyan]")

    except SlackApiError as e:
        print(f"[red]Erro na API do Slack: {e.response['error']}[/red]")


def capturar():
    mac = variavel_obrigatoria("MAC_ADDRESS").upper().replace(":", "").replace("-", "")
    if not mac:
        raise RuntimeError("Não foi possível obter o MAC desta máquina")

    cnx = mysql.connector.connect(**DB)
    try:
        cursor = cnx.cursor(dictionary=True)

        cursor.execute(SQL_COMPONENTES, (mac,))
        componentes = cursor.fetchall()
        if not componentes:
            print(f"[yellow]Nenhum componente ativo para a máquina {mac}[/yellow]")
            return

        fk_empresa = componentes[0]["fk_empresa"]
        ids = list({c["fk_componentes"] for c in componentes})
        cursor.execute(
            "SELECT fk_componentes, nivel, valor_min, valor_max FROM limites "
            f"WHERE fk_empresa = %s AND fk_componentes IN ({','.join(['%s'] * len(ids))})",
            [fk_empresa, *ids],
        )
        limites = {}
        for l in cursor.fetchall():
            limites.setdefault(l["fk_componentes"], []).append(l)

        agora = datetime.now()
        leituras = []
        print(f"\n[blue]{agora:%H:%M:%S}[/blue]  máquina [bold]{mac}[/bold]")
        resumo_rede = coletar_conexoes() if any(c["biblioteca"] == "interno" for c in componentes) else None

        for c in componentes:
            try:
                if c["biblioteca"] == "interno":
                    bruto = resumo_rede[c["codigo"]]
                else:
                    if c["biblioteca"] not in BIBLIOTECAS_PERMITIDAS:
                        raise ValueError(f"biblioteca '{c['biblioteca']}' não permitida")

                    modulo = importlib.import_module(c["biblioteca"])
                    espaco = {**vars(modulo), modulo.__name__: modulo}
                    bruto = eval(c["codigo"], {"__builtins__": {}}, espaco)

                unidade = (c["unidade_medida"] or "").strip()
                valor = round(float(bruto) / BYTES.get(unidade.upper(), 1), 2)

                tipo = identificar_tipo(c["tipo"], c["nome"])
                nivel = classificar(tipo, valor, unidade, limites.get(c["fk_componentes"]))
                situacao, cor = NIVEIS.get(nivel, ("Sem limite", "white"))

                leituras.append((valor, agora, c["cm_id"], nivel, c["nome"], unidade))
                print(f"{c['nome']}: [bold {cor}]{valor} {unidade}[/bold {cor}] ({situacao})")

            except Exception as erro:
                print(f"[red]Falha ao capturar '{c['nome']}': {erro}[/red]")
            except Exception as erro:
                print(f"[red]Falha ao capturar '{c['nome']}': {erro}[/red]")

        if leituras:
            for valor, dt_hr, cm_id, nivel, nome_comp, unidade in leituras:
                cursor.execute(
                    "INSERT INTO leitura (valor, dt_hr_leitura, fk_config_maq) "
                    "VALUES (%s, %s, %s)",
                    (valor, dt_hr, cm_id),
                )
                if nivel is not None:
                    cursor.execute(
                        "INSERT INTO discretizada "
                        "(fk_leitura, situacao, consciente) "
                        "VALUES (%s, %s, %s)",
                        (cursor.lastrowid, NIVEIS[nivel][0], False),
                    )

                    if nivel in (2, 3):
                        notificar_slack(
                            cursor, fk_empresa, mac, cm_id, nome_comp, valor, unidade, nivel
                        )
            cnx.commit()
    finally:
        cnx.close()


if __name__ == "__main__":
    while True:
        inicio_captura = t.monotonic()
        try:
            capturar()
        except mysql.connector.Error as erro:
            print(f"[red]Erro de banco: {erro}[/red]")
        t.sleep(max(0, INTERVALO - (t.monotonic() - inicio_captura)))