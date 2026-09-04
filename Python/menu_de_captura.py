import psutil


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
