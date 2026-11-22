"""Consulta da identidade e configuração da EC2 interna; métricas ficam no Captura_PeakStack."""

from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import time
from urllib.request import Request, ProxyHandler, build_opener

INTERVALO_CAPTURA = 10
INTERVALO_INVENTARIO = 300


def carregar_configuracao():
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).with_name(".env"), override=False)
    campos = ("DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME", "MAC_ADDRESS")
    faltantes = [nome for nome in campos if not os.getenv(nome)]
    if faltantes:
        raise ValueError("Configure no Python/.env: " + ", ".join(faltantes))
    mac = os.environ["MAC_ADDRESS"].strip().upper().replace(":", "").replace("-", "")
    if len(mac) != 12 or any(c not in "0123456789ABCDEF" for c in mac):
        raise ValueError("MAC_ADDRESS deve conter os 12 caracteres hexadecimais da máquina cadastrada.")
    return {
        "user": os.environ["DB_USER"], "password": os.environ["DB_PASSWORD"],
        "host": os.environ["DB_HOST"], "port": int(os.environ["DB_PORT"]),
        "database": os.environ["DB_NAME"], "use_pure": True,
        "auth_plugin": "mysql_native_password", "connection_timeout": 5,
    }, mac


def criar_conexao(configuracao):
    import mysql.connector

    return mysql.connector.connect(**configuracao, autocommit=True)


def data_utc(valor):
    data = datetime.fromisoformat(valor)
    if data.tzinfo is None:
        raise ValueError("A data da captura deve conter fuso horário.")
    return data.astimezone(timezone.utc).replace(tzinfo=None)


def salvar_captura_banco(configuracao, mac, captura):
    """Cada snapshot pertence à mesma máquina/empresa das métricas de componentes."""
    identidade = captura["identidade"]
    inventario = captura["inventario"]
    dados = json.dumps(captura, ensure_ascii=False, allow_nan=False)
    capturado_em = data_utc(captura["capturado_em"])
    consultado_em = data_utc(inventario["consultado_em"]) if inventario else None
    conexao = criar_conexao(configuracao)
    cursor = None
    try:
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT id, fk_empresa
            FROM maquina
            WHERE UPPER(REPLACE(REPLACE(mac_address, ':', ''), '-', '')) = %s
        """, (mac,))
        maquinas = cursor.fetchall()
        if len(maquinas) != 1:
            raise ValueError("MAC_ADDRESS deve identificar exatamente uma máquina cadastrada no banco.")
        maquina, empresa = maquinas[0]
        cursor.execute("""
            INSERT INTO ec2_captura (
                fk_maquina, fk_empresa, instancia_id, regiao, capturado_em,
                inventario_consultado_em, estado_inventario, dados
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
        """, (maquina, empresa, captura["instancia_id"], identidade["regiao"],
              capturado_em, consultado_em, captura["estado_inventario"], dados))
    finally:
        if cursor is not None:
            cursor.close()
        conexao.close()


def agora_utc():
    return datetime.now(timezone.utc).isoformat()


def identificar_instancia():
    origem = os.getenv("EC2_IMDS_URL", "").strip().rstrip("/")

    if not origem:
        raise ValueError("Configure EC2_IMDS_URL no Python/.env.")

    # faz o python consultar o imds diretamente
    # IMDS -> Serviço de metadados da EC2, serve para coletar o json das informações da ec2
    sem_proxy = ProxyHandler({})
    cliente = build_opener(sem_proxy)

    # Faz a requisição para pegar o token
    pedido = Request(f"{origem}/api/token", method="PUT",
                     headers={"X-aws-ec2-metadata-token-ttl-seconds": "60"})

    # Envia o pedido , limita a espera e fecha a resposta
    with cliente.open(pedido, timeout=2) as resposta:
        token = resposta.read().decode("utf-8")

    # Le o corpo da resposta e converte em texto, recebido pelo token
    pedido = Request(f"{origem}/dynamic/instance-identity/document",
                     headers={"X-aws-ec2-metadata-token": token})

    # client open -> envia o pedido de identidade, le o json e converte em dicionario
    with cliente.open(pedido, timeout=2) as resposta:
        documento = json.load(resposta)

    # verifica os campos para verificar buscando valor, caso vazio, interrompe
    #retorna o  o dicionario com os nomes do que é utilizado
    for campo in ("instanceId", "instanceType", "region", "availabilityZone"):
        if not documento.get(campo):
            raise ValueError(f"Identidade EC2 incompleta: {campo}")
    return {
        "id": documento["instanceId"], "tipo": documento["instanceType"],
        "regiao": documento["region"], "zona_disponibilidade": documento["availabilityZone"],
        "imagem_id": documento.get("imageId"), "arquitetura": documento.get("architecture"),
    }


def consultar_inventario(cliente, identidade):

# pede os detalhes do id
    resposta = cliente.describe_instances(InstanceIds=[identidade["id"]])

# agrupa as instancias
    instancias = [i for r in resposta["Reservations"] for i in r["Instances"]]


    if len(instancias) != 1 or instancias[0]["InstanceId"] != identidade["id"]:
        raise ValueError("A AWS não retornou a instância esperada.")
    
    instancia = instancias[0]

    volumes = []

# traz os discos ligados a intancia e guarda informações como id , tipo, capacidade e estado
    paginas = cliente.get_paginator("describe_volumes").paginate(
        Filters=[{"Name": "attachment.instance-id", "Values": [identidade["id"]]}]
    )


# Percorre os dados e retorna no formato de dicionario
    for pagina in paginas:
        for volume in pagina["Volumes"]:
            volumes.append({
                "id": volume["VolumeId"], "tipo": volume["VolumeType"],
                "capacidade_gib": volume["Size"], "iops": volume.get("Iops"),
                "throughput_mib_s": volume.get("Throughput"), "estado": volume["State"],
                "multi_attach": volume.get("MultiAttachEnabled", False),
                "anexos": [
                    {"instancia_id": a["InstanceId"], "dispositivo": a["Device"],
                     "estado": a["State"], "anexado_em": a["AttachTime"].isoformat()}
                    for a in volume.get("Attachments", [])
                ],
            })
    return {
        "consultado_em": agora_utc(),
        "instancia": {
            **identidade, "tipo": instancia["InstanceType"],
            "estado": instancia["State"]["Name"],
            "plataforma": instancia.get("PlatformDetails"),
            "operacao_uso": instancia.get("UsageOperation"),
            "tenancy": instancia["Placement"]["Tenancy"],
            "ciclo_vida": instancia.get("InstanceLifecycle", "on-demand"),
            "iniciada_em": instancia["LaunchTime"].isoformat(),
            "codigos_produto": instancia.get("ProductCodes", []),
        },
        "volumes_ebs": sorted(volumes, key=lambda v: v["id"]),
    }

# prepara o objeto para consultar api da ec2
def criar_cliente(regiao):
    import boto3
    from botocore.config import Config
    # abre sessão e credenciais e define o tempo para conexão
    return boto3.Session().client(
        "ec2", region_name=regiao,
        config=Config(connect_timeout=2, read_timeout=3, retries={"total_max_attempts": 1}),
    )

# transforma um erro da consulta à AWS em uma mensagem fácil de entender
def descrever_erro_inventario(erro):
    codigo = getattr(erro, "response", {}).get("Error", {}).get("Code", type(erro).__name__)
    if codigo in {"UnauthorizedOperation", "AccessDenied", "AccessDeniedException", "AuthFailure"}:
        mensagem = "A sessão atual não permite consultar EC2/EBS. Use as permissões já disponibilizadas pelo laboratório."
    elif codigo in {"ExpiredToken", "ExpiredTokenException", "RequestExpired", "InvalidClientTokenId"}:
        mensagem = "Credenciais temporárias inválidas ou expiradas. Renove a sessão do laboratório e as credenciais usadas pelo SDK."
    elif codigo in {"NoCredentialsError", "PartialCredentialsError"}:
        mensagem = "Credenciais AWS ausentes ou incompletas. Configure a sessão temporária do laboratório, incluindo o token de sessão."
    else:
        mensagem = "Não foi possível consultar o inventário AWS. Verifique a conectividade e a sessão do laboratório."
    return {"codigo": codigo, "mensagem": mensagem}

# cordena execução do que tem que ser feito
def main():

    # carrega a configuração do .env
    # consulta a aws a cada 5min
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        configuracao_db, mac = carregar_configuracao()
    except Exception as erro:
        logging.error("Falha ao configurar o MySQL (%s). Verifique Python/.env, as dependências e a tabela ec2_captura.", type(erro).__name__)
        return 1
    try:
        identidade = identificar_instancia()
    except ValueError as erro:
        logging.error("Falha ao identificar a EC2: %s", erro)
        return 1
    except Exception as erro:
        logging.error("Falha ao acessar o IMDSv2 (%s). Confira EC2_IMDS_URL no Python/.env.", type(erro).__name__)
        return 1
    inventario = None
    erro_inventario = None
    estado = "indisponivel"
    proxima_consulta = 0

    try:
        while True:
            inicio = time.monotonic()

            # Reaproveita a última resposta da AWS entre as gravações no banco.
            if inicio >= proxima_consulta:
                try:
                    cliente = criar_cliente(identidade["regiao"])
                    inventario = consultar_inventario(cliente, identidade)
                    erro_inventario = None
                    estado = "atualizado"
                except Exception as erro:
                    erro_inventario = descrever_erro_inventario(erro)
                    estado = "desatualizado" if inventario else "indisponivel"
                    logging.warning("Inventário AWS (%s): %s", estado, erro_inventario["mensagem"])
                proxima_consulta = time.monotonic() + INTERVALO_INVENTARIO
            
            # grava no mysql a cada 10 segundos
            captura = {
                "versao": 2,
                "capturado_em": agora_utc(),
                "instancia_id": identidade["id"],
                "identidade": identidade,
                "inventario": inventario,
                "estado_inventario": estado,
                "erro_inventario": erro_inventario,
            }
            try:
                salvar_captura_banco(configuracao_db, mac, captura)
                logging.info("Captura salva no MySQL: %s; inventário %s", identidade["id"], estado)
            except Exception:
                logging.exception("Falha na captura ou gravação MySQL. Confira a conexão, o MAC e a tabela ec2_captura; nenhuma leitura substituta será criada.")
            tempo_gasto = time.monotonic() - inicio
            time.sleep(max(0, INTERVALO_CAPTURA - tempo_gasto))
    except KeyboardInterrupt:
        logging.info("Coleta encerrada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
