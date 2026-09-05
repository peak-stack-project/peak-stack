import time
import psutil

from conexaobd import mydb, mycursor


gigabyte = 1024 ** 3


def capturar_dados():

    uso_cpu = psutil.cpu_percent(interval=1)

    qtd_cpu_log = psutil.cpu_count()
    qtd_cpu_fisico = psutil.cpu_count(logical=False)

    cpu_freq = psutil.cpu_freq()

    if cpu_freq is not None:
        frequencia_cpu = cpu_freq.current
    else:
        frequencia_cpu = None

    memoria = psutil.virtual_memory()

    memoria_total = memoria.total / gigabyte
    memoria_disponivel = memoria.available / gigabyte
    memoria_utilizada = memoria.used / gigabyte
    memoria_percentual = memoria.percent

    disco = psutil.disk_usage("C:\\")

    disco_total = disco.total / gigabyte
    disco_livre = disco.free / gigabyte
    disco_utilizado = disco.used / gigabyte
    disco_percentual = disco.percent

    dados = {
        "uso_cpu": uso_cpu,
        "qtd_cpu_log": qtd_cpu_log,
        "qtd_cpu_fisico": qtd_cpu_fisico,
        "frequencia_cpu": frequencia_cpu,
        "memoria_total": memoria_total,
        "memoria_disponivel": memoria_disponivel,
        "memoria_utilizada": memoria_utilizada,
        "memoria_percentual": memoria_percentual,
        "disco_total": disco_total,
        "disco_livre": disco_livre,
        "disco_utilizado": disco_utilizado,
        "disco_percentual": disco_percentual
    }

    return dados


def cadastrar_maquina():

    nome_maquina = input("Digite o nome/código da máquina ou do dono: ")

    dados = capturar_dados()

    comando_insert_maquina = """
    INSERT INTO maquinas_virtuais (
        nomeMaquina,
        nucleosFisicos,
        processadoresLogicos,
        frequenciaMaxima,
        memoriaTotal,
        discoTotal,
        fkServidor
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    valores_maquina = (
        nome_maquina,
        dados["qtd_cpu_fisico"],
        dados["qtd_cpu_log"],
        dados["frequencia_cpu"],
        dados["memoria_total"],
        dados["disco_total"],
        1
    )

    mycursor.execute(comando_insert_maquina, valores_maquina)
    mydb.commit()

    fk_maquina = mycursor.lastrowid

    print(f"Máquina '{nome_maquina}' cadastrada com o id {fk_maquina}")

    return fk_maquina


def iniciar_coleta(fk_maquina):

    while True:

        dados = capturar_dados()

        comando_insert = """
        INSERT INTO leituras (
            usoCpu,
            frequenciaAtual,
            memoriaDisponivel,
            memoriaUtilizada,
            percentualMemoria,
            discoLivre,
            discoUtilizado,
            percentualDisco,
            fkMaquina
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        valores = (
            dados["uso_cpu"],
            dados["frequencia_cpu"],
            dados["memoria_disponivel"],
            dados["memoria_utilizada"],
            dados["memoria_percentual"],
            dados["disco_livre"],
            dados["disco_utilizado"],
            dados["disco_percentual"],
            fk_maquina
        )

        mycursor.execute(comando_insert, valores)
        mydb.commit()

        print(
            "Dados inseridos: usoCpu, frequenciaAtual, memoriaDisponivel, "
            "memoriaUtilizada, percentualMemoria, discoLivre, discoUtilizado, "
            "percentualDisco, fkMaquina"
        )

        time.sleep(3)


if __name__ == "__main__":
    fk_maquina = cadastrar_maquina()
    iniciar_coleta(fk_maquina)