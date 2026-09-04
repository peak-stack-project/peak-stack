from conexaobd import mydb, mycursor

def consultar_dados():
    comando_select = """
    
        SELECT 
            usoCpu,
            frequenciaAtual,
            memoriaDisponivel,
            memoriaUtilizada,
            percentualMemoria,
            discoLivre,
            discoUtilizado,
            percentualDisco,
            fkMaquina
        FROM leituras LIMIT 1;
        """
    
    mycursor.execute(comando_select)
    comandos = mycursor.fetchall()

    print(comandos)
    
    dados_coletados = comandos[0]
    
    (
    usoCpu,
    frequenciaAtual,
    memoriaDisponivel,
    memoriaUtilizada,
    percentualMemoria,
    discoLivre,
    discoUtilizado,
    percentualDisco,
    fkMaquina
    ) = dados_coletados
    
    return dados_coletados