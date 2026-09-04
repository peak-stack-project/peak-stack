

from insert import iniciar_coleta
from oselect import consultar_dados
from puxardados import exibir_dados
from deletar_dados import deletar_ultimos_cinco




opcao = ""




while opcao != "0":

    print("\n1 - Começar coleta")
    print("2 - Consultar dados")
    print("3 - Atualizar um dado")
    print("4 - Deletar os últimos 5 dados")
    print("0 - Sair")



    opcao = input("Escolha uma opção: ")

    if opcao == "1":

        iniciar_coleta()

    elif opcao == "2":

        dados_consultados = consultar_dados()

        exibir_dados(dados_consultados)

    elif opcao == "3":

        intervalo_captura = atualizar_intervalo(
            intervalo_captura
        )

    elif opcao == "4":

        deletar_ultimos_cinco()

    elif opcao == "0":

        print("Programa encerrado.")

    else:

        print("Opção inválida.")


print("Conexão com o banco encerrada.")