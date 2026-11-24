import os
import mysql.connector
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from dotenv import load_dotenv
from datetime import datetime

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DB_CONFIG = {
    "host":     os.getenv("DB_HOST"),
    "database": os.getenv("DB_DATABASE") or os.getenv("DB_NAME", "db_peakstack"),
    "user":     os.getenv("DB_USER", "").strip("'"),
    "password": os.getenv("DB_PASSWORD", "").strip("'"),
    "port":     int(os.getenv("DB_PORT", 3306))
}

SLACK_TOKEN   = os.getenv("SLACK_BOT_TOKEN") or os.getenv("SLACK_TOKEN")
SLACK_CHANNEL = os.getenv("SLACK_CHANNEL", "#monitoramento")
ID_EMPRESA    = int(os.getenv("ID_EMPRESA", 1))


def badge_status(pct):
    if pct <= 60:  return "Normal"
    if pct <= 85:  return "Atenção"
    return "Crítico"

def seta(inicio, fim):
    diff = fim - inicio
    if diff > 1:   return f"{fim:.1f}% ↑ (+{diff:.1f}%)"
    if diff < -1:  return f"{fim:.1f}% ↓ ({diff:.1f}%)"
    return f"{fim:.1f}% → (estável)"


def buscar_dados():
    conn   = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # Leitura ao "dormir" = última leitura antes das 00:00 de hoje (23:00–23:59 ontem)
    # Leitura ao "acordar" = primeira leitura do dia após 07:00
    cursor.execute(f"""
        SELECT
            m.id AS idMaquina,
            m.nome,
            m.mac_address AS macAddress,

            /* RAM ao dormir — última leitura entre 22h e 00h de ontem */
            COALESCE((
                SELECT ROUND(l.valor, 1)
                FROM leitura l
                INNER JOIN config_maq cm ON cm.id = l.fk_config_maq
                INNER JOIN componentes c ON c.id = cm.fk_componentes
                INNER JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
                WHERE cm.fk_maquina = m.id AND cc.tipo = 'RAM' AND cc.unidade_medida = '%'
                  AND l.dt_hr_leitura BETWEEN CONCAT(CURDATE() - INTERVAL 1 DAY, ' 22:00:00')
                                          AND CONCAT(CURDATE(), ' 00:00:00')
                ORDER BY l.dt_hr_leitura DESC LIMIT 1
            ), 0) AS ramAoDormir,

            /* RAM ao acordar — primeira leitura do dia a partir de 07h */
            COALESCE((
                SELECT ROUND(l.valor, 1)
                FROM leitura l
                INNER JOIN config_maq cm ON cm.id = l.fk_config_maq
                INNER JOIN componentes c ON c.id = cm.fk_componentes
                INNER JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
                WHERE cm.fk_maquina = m.id AND cc.tipo = 'RAM' AND cc.unidade_medida = '%'
                  AND l.dt_hr_leitura >= CONCAT(CURDATE(), ' 07:00:00')
                ORDER BY l.dt_hr_leitura ASC LIMIT 1
            ), 0) AS ramAoAcordar,

            /* Pico da madrugada (00h–07h59) */
            COALESCE((
                SELECT ROUND(MAX(l.valor), 1)
                FROM leitura l
                INNER JOIN config_maq cm ON cm.id = l.fk_config_maq
                INNER JOIN componentes c ON c.id = cm.fk_componentes
                INNER JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
                WHERE cm.fk_maquina = m.id AND cc.tipo = 'RAM' AND cc.unidade_medida = '%'
                  AND l.dt_hr_leitura BETWEEN CONCAT(CURDATE(), ' 00:00:00')
                                          AND CONCAT(CURDATE(), ' 07:59:59')
            ), 0) AS picoNoite,

            /* Horário do pico */
            COALESCE((
                SELECT DATE_FORMAT(l.dt_hr_leitura, '%H:%i')
                FROM leitura l
                INNER JOIN config_maq cm ON cm.id = l.fk_config_maq
                INNER JOIN componentes c ON c.id = cm.fk_componentes
                INNER JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
                WHERE cm.fk_maquina = m.id AND cc.tipo = 'RAM' AND cc.unidade_medida = '%'
                  AND l.dt_hr_leitura BETWEEN CONCAT(CURDATE(), ' 00:00:00')
                                          AND CONCAT(CURDATE(), ' 07:59:59')
                ORDER BY l.valor DESC LIMIT 1
            ), '--:--') AS horarioPico,

            /* Minutos em estado crítico (>85%) durante a madrugada */
            COALESCE((
                SELECT COUNT(*) * 5
                FROM leitura l
                INNER JOIN config_maq cm ON cm.id = l.fk_config_maq
                INNER JOIN componentes c ON c.id = cm.fk_componentes
                INNER JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
                WHERE cm.fk_maquina = m.id AND cc.tipo = 'RAM' AND cc.unidade_medida = '%'
                  AND l.valor > 85
                  AND l.dt_hr_leitura BETWEEN CONCAT(CURDATE(), ' 00:00:00')
                                          AND CONCAT(CURDATE(), ' 07:59:59')
            ), 0) AS minutosCriticos

        FROM maquina m
        WHERE m.fk_empresa = {ID_EMPRESA}
        ORDER BY picoNoite DESC, m.nome ASC;
    """)

    dados  = cursor.fetchall()
    cursor.close()
    conn.close()
    return dados


def formatar_tempo_critico(minutos):
    if minutos == 0:
        return "0 min"
    h = minutos // 60
    m = minutos % 60
    if h > 0:
        return f"{h}h {m:02d}min" if m > 0 else f"{h}h"
    return f"{m} min"


def montar_mensagem(servidores):
    hoje        = datetime.now().strftime("%d/%m/%Y")
    com_problema = [s for s in servidores if float(s["picoNoite"]) > 60]
    linhas       = [f"*Relatório Noturno · PeakStack*\n{hoje} · 00:00 até 07:59\n"]

    for s in servidores:
        dormir   = float(s["ramAoDormir"])
        acordar  = float(s["ramAoAcordar"])
        pico     = float(s["picoNoite"])
        minutos  = int(s["minutosCriticos"])
        status   = badge_status(pico)
        emoji    = "🔴" if pico > 85 else ("🟡" if pico > 60 else "🟢")

        bloco = (
            f"{emoji} *{s['nome']}* — {status}\n"
            f"  RAM ao sair: {dormir:.1f}%  →  ao chegar: {seta(dormir, acordar)}\n"
            f"  Pico da madrugada: *{pico:.1f}%* às {s['horarioPico']}\n"
            f"  Tempo crítico (>85%): {formatar_tempo_critico(minutos)}\n"
        )

        # Ação recomendada
        diff = acordar - dormir
        if pico > 85 and diff > 10:
            bloco += f"  ⚠️ _RAM subiu {diff:.1f}% durante a noite — verificar processos._\n"
        elif pico > 85:
            bloco += f"  ⚠️ _Pico crítico registrado. Monitorar ao longo do dia._\n"
        else:
            bloco += f"  ✅ _Sem ocorrências durante a madrugada._\n"

        linhas.append(bloco)

    # Resumo final
    total    = len(servidores)
    problema = len(com_problema)
    if problema == 0:
        linhas.append(f"*Resumo:* todos os {total} servidores operaram normalmente.")
    else:
        linhas.append(f"*Resumo:* {problema} de {total} servidor(es) precisa(m) de atenção hoje.")

    return "\n".join(linhas)


def enviar_slack(mensagem):
    client = WebClient(token=SLACK_TOKEN)
    response = client.chat_postMessage(
        channel=SLACK_CHANNEL,
        text=mensagem,
        mrkdwn=True
    )
    print(f"✅ Relatório enviado ao Slack. ts={response['ts']}")


if __name__ == "__main__":
    print("🌙 Gerando relatório noturno de RAM...")
    servidores = buscar_dados()

    if not servidores:
        print("⚠️  Nenhum servidor encontrado para esta empresa.")
        exit(0)

    mensagem = montar_mensagem(servidores)
    print("\n--- Preview ---")
    print(mensagem)
    print("---------------\n")
    enviar_slack(mensagem)
