import mysql.connector
from rich import print
from getmac import get_mac_address
import getpass
import psutil as p
import time as t
from datetime import datetime
import importlib
import os

INTERVALO = 5

BIBLIOTECAS_PERMITIDAS = {"psutil"}

BYTES = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3, "TB": 1024**4}

NIVEIS = {1: ("Normal", "green"), 2: ("Alerta", "yellow"), 3: ("Crítico", "red")}

LIMITE_ALERTA_PADRAO = 50
LIMITE_CRITICO_PADRAO = 80

DB = dict(
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "urubu100"),
    host=os.getenv("DB_HOST", "100.30.212.47"),
    port=int(os.getenv("DB_PORT", 3306)),
    database=os.getenv("DB_NAME", "db_peakstack"),
    use_pure=True,
)

SQL_COMPONENTES = """
    SELECT cm.id AS cm_id,
           cm.fk_componentes,
           m.fk_empresa,
           c.nome,
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


def classificar(valor, regras):
    if not regras:
        if valor > LIMITE_CRITICO_PADRAO:
            return 3
        if valor > LIMITE_ALERTA_PADRAO:
            return 2
        return 1

    return max(
        (
            r["nivel"]
            for r in regras
            if (r["valor_min"] is None or valor >= float(r["valor_min"]))
            and (r["valor_max"] is None or valor <= float(r["valor_max"]))
        ),
        default=1,
    )


def capturar(mac=None):
    mac = (mac or get_mac_address() or "").upper().replace(":", "").replace("-", "")
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

        for c in componentes:
            try:
                if c["biblioteca"] not in BIBLIOTECAS_PERMITIDAS:
                    raise ValueError(f"biblioteca '{c['biblioteca']}' não permitida")

                modulo = importlib.import_module(c["biblioteca"])
                espaco = {**vars(modulo), modulo.__name__: modulo}
                bruto = eval(c["codigo"], {"__builtins__": {}}, espaco)

                unidade = (c["unidade_medida"] or "").strip()
                valor = round(float(bruto) / BYTES.get(unidade.upper(), 1), 2)

                nivel = classificar(valor, limites.get(c["fk_componentes"], []))
                situacao, cor = NIVEIS.get(nivel, (f"Nível {nivel}", "white"))

                leituras.append((nivel, agora, c["cm_id"]))
                print(f"{c['nome']}: [bold {cor}]{valor} {unidade}[/bold {cor}] ({situacao})")

            except Exception as erro:
                print(f"[red]Falha ao capturar '{c['nome']}': {erro}[/red]")

        if leituras:
            cursor.executemany(
                "INSERT INTO leitura (valor, dt_hr_leitura, fk_config_maq) "
                "VALUES (%s, %s, %s)",
                leituras,
            )
            cnx.commit()
    finally:
        cnx.close()


if __name__ == "__main__":
    while True:
        try:
            capturar()
        except mysql.connector.Error as erro:
            print(f"[red]Erro de banco: {erro}[/red]")
        t.sleep(INTERVALO)