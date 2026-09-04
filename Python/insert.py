import psutil
import time
from conexaobd import mydb, mycursor
from menu_de_captura import  capturar_dados


mydb

def iniciar_coleta():

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
            1

        )

        mycursor.execute(comando_insert, valores)
        mydb.commit()
        print("Dados inseridos")
        time.sleep(3)