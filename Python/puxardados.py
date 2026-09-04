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
        fk_maquina
    ) = dados_consultados

    opcao = ""

    while opcao != "0":

        print("\n1 - Uso da CPU")
        print("2 - Frequência da CPU")
        print("3 - Memória disponível")
        print("4 - Memória utilizada")
        print("5 - Percentual da memória")
        print("6 - Espaço livre no disco")
        print("7 - Espaço utilizado no disco")
        print("8 - Percentual do disco")
        print("9 - Todas as informações")
        print("0 - Voltar")

        opcao = input(
            "Escolha o dado que deseja visualizar: "
        )

        if opcao == "1":
            print("Uso da CPU:", uso_cpu, "%")

        elif opcao == "2":
            print(
                "Frequência da CPU:",
                frequencia_atual,
                "MHz"
            )

        elif opcao == "3":
            print(
                "Memória disponível:",
                memoria_disponivel,
                "GB"
            )

        elif opcao == "4":
            print(
                "Memória utilizada:",
                memoria_utilizada,
                "GB"
            )

        elif opcao == "5":
            print(
                "Uso da memória:",
                percentual_memoria,
                "%"
            )

        elif opcao == "6":
            print("Disco livre:", disco_livre, "GB")

        elif opcao == "7":
            print(
                "Disco utilizado:",
                disco_utilizado,
                "GB"
            )

        elif opcao == "8":
            print(
                "Uso do disco:",
                percentual_disco,
                "%"
            )

        elif opcao == "9":
            print("Uso da CPU:", uso_cpu, "%")
            print(
                "Frequência da CPU:",
                frequencia_atual,
                "MHz"
            )
            print(
                "Memória disponível:",
                memoria_disponivel,
                "GB"
            )
            print(
                "Memória utilizada:",
                memoria_utilizada,
                "GB"
            )
            print(
                "Uso da memória:",
                percentual_memoria,
                "%"
            )
            print("Disco livre:", disco_livre, "GB")
            print(
                "Disco utilizado:",
                disco_utilizado,
                "GB"
            )
            print(
                "Uso do disco:",
                percentual_disco,
                "%"
            )
            print("Máquina:", fk_maquina)

        elif opcao == "0":
            print("Voltando ao menu principal.")

        else:
            print("Opção inválida.")