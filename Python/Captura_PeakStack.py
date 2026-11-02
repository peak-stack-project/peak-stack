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

# Padrão usado quando a empresa não cadastrou limite para o componente.
# "maior": pior quando o valor sobe -> (atencao_a_partir_de, critico_a_partir_de)
# "menor": pior quando o valor desce -> (atencao_ate, critico_abaixo_de)
# O último campo é a unidade exigida (None = qualquer), para não aplicar % em GB.
LIMITES_PADRAO = {
    "cpu":              ("maior", 61, 85, "%"),
    "ram":              ("maior", 61, 85, "%"),
    "disco":            ("maior", 60, 71, "%"),
    "memória restante": ("menor", 40, 15, "%"),
    "pacotes perdidos": ("maior", 50, 500, None),
}


DB = dict(
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "urubu100"),
    host=os.getenv("DB_HOST", "bd-peakstack"),
    port=int(os.getenv("DB_PORT", 3306)),
    database=os.getenv("DB_NAME", "db_peakstack"),
    use_pure=True,
)

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
        return None  # componente sem padrão definido

    sentido, atencao, critico, unidade_exigida = regra
    if unidade_exigida and unidade != unidade_exigida:
        return None  # ex.: RAM em GB não usa o padrão em %
    if sentido == "maior":
        if valor >= critico:
            return 3
        if valor >= atencao:
            return 2
    else:  # "menor"
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


def capturar(mac=None):
    mac = (mac or get_mac_address() or "").upper().replace(":", "").replace("-", "")
    if not mac:
        raise RuntimeError("Não foi possível obter o MAC desta máquina")

    cnx = mysql.connector.connect(**DB)
    try:
        cursor = cnx.cursor(dictionary=True)

        # isso aqui pergunta quais componentes ativos esta máquina deve monitorar
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

        # e essa faz a captura genérica, guiada pela biblioteca e codigo que vieram do BD
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

                # limites da empresa; se não tiver, usa o padrão do código
                tipo = identificar_tipo(c["tipo"], c["nome"])
                nivel = classificar(tipo, valor, unidade, limites.get(c["fk_componentes"]))
                situacao, cor = NIVEIS.get(nivel, ("Sem limite", "white"))

                leituras.append((valor, agora, c["cm_id"], nivel))
                print(f"{c['nome']}: [bold {cor}]{valor} {unidade}[/bold {cor}] ({situacao})")

            except Exception as erro:  # um componente com problema não derruba os demais
                print(f"[red]Falha ao capturar '{c['nome']}': {erro}[/red]")

        if leituras:
            for valor, dt_hr, cm_id, nivel in leituras:
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