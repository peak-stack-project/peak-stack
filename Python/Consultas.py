from conexaobd import mycursor


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
            download,
            upload,
            pacotesPerdidos,
            statusCpu,
            statusMemoria,
            statusDisco,
            statusRede,
            statusGeral,
            fkMaquina
        FROM leituras
        ORDER BY idLeitura DESC
        LIMIT 1;
    """

    mycursor.execute(comando_select)
    comandos = mycursor.fetchall()

    if not comandos:
        return None

    dados_coletados = comandos[0]

    return dados_coletados


def exibir_dados(dados_consultados):

    if dados_consultados is None:
        print("Nenhum dado encontrado.")
        return

    (
        uso_cpu,
        frequencia_atual,
        memoria_disponivel,
        memoria_utilizada,
        percentual_memoria,
        disco_livre,
        disco_utilizado,
        percentual_disco,
        download,
        upload,
        pacotes_perdidos,
        status_cpu,
        status_memoria,
        status_disco,
        status_rede,
        status_geral,
        fk_maquina
    ) = dados_consultados

    opcao = ""

    while opcao != "0":

        print("\n1 - Dados CPU")
        print("2 - Dados Memória")
        print("3 - Dados Disco")
        print("4 - Dados Redes")
        print("5 - Status geral")
        print("6 - Todas as informações")
        print("0 - Voltar")

        opcao = input("Escolha o dado que deseja visualizar: ")

        if opcao == "1":
            print("Uso da CPU:", uso_cpu, "% -", status_cpu)
            print("Frequência da CPU:", frequencia_atual, "MHz")
            

        elif opcao == "2":
           print("Memória disponível:", memoria_disponivel, "GB")
           print("Memória utilizada:", memoria_utilizada, "GB")
           print("Uso da memória:", percentual_memoria, "% -", status_memoria)

        elif opcao == "3":
            print("Disco livre:", disco_livre, "GB")
            print("Disco utilizado:", disco_utilizado, "GB")
            print("Uso do disco:", percentual_disco, "% -", status_disco)

        elif opcao == "4":
           print("Download:", download, "MB")
           print("Upload:", upload, "MB")
           print("Pacotes perdidos:", pacotes_perdidos, "-", status_rede)

        elif opcao == "5":
             print("Uso da CPU:", uso_cpu, "% -", status_cpu)
             print("Uso da memória:", percentual_memoria, "% -", status_memoria)
             print("Uso do disco:", percentual_disco, "% -", status_disco)
             print("Pacotes perdidos:", pacotes_perdidos, "-", status_rede)
             print("Status geral:", status_geral)

        elif opcao == "6":
           print("Uso da CPU:", uso_cpu, "% -", status_cpu)
           print("Frequência da CPU:", frequencia_atual, "MHz")
           print("Memória disponível:", memoria_disponivel, "GB")
           print("Memória utilizada:", memoria_utilizada, "GB")
           print("Uso da memória:", percentual_memoria, "% -", status_memoria)
           print("Disco livre:", disco_livre, "GB")
           print("Disco utilizado:", disco_utilizado, "GB")
           print("Uso do disco:", percentual_disco, "% -", status_disco)
           print("Download:", download, "MB")
           print("Upload:", upload, "MB")
           print("Pacotes perdidos:", pacotes_perdidos, "-", status_rede)
           print("Status geral:", status_geral)
           print("Máquina:", fk_maquina)

        elif opcao == "0":
            print("Voltando ao menu principal.")

        else:
            print("Opção inválida.")


if __name__ == "__main__":
    dados_consultados = consultar_dados()
    exibir_dados(dados_consultados)