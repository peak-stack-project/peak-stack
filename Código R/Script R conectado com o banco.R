# no console do computador install.packages("RMariaDB") install.packages("rstudioapi")
#install.packages("DBI")

library(DBI)
library(RMariaDB) 

con <- dbConnect(
  RMariaDB::MariaDB(),
  dbname   = "db_peakstack",
  host     = "54.84.128.162",       
  port     = 3306,                 
  user     = "root",
  password = rstudioapi::askForPassword("urubu100")
)

# 2. Consulta SQL trazendo Máquina, Componente e Valor
query <- "
  SELECT 
    m.nome AS nome_maquina,
    cc.tipo AS componente,
    l.valor AS valor
  FROM db_peakstack.leitura l
  JOIN db_peakstack.config_maq cm     ON l.fk_config_maq = cm.id
  JOIN db_peakstack.maquina m         ON cm.fk_maquina = m.id
  JOIN db_peakstack.componentes c     ON cm.fk_componentes = c.id
  JOIN db_peakstack.configuracao_comp cc ON c.fk_configuracao_comp = cc.id
"
dados <- dbGetQuery(con, query)
dbDisconnect(con) 

dados$valor <- as.numeric(dados$valor)

cpu   <- subset(dados, componente == "CPU")
ram   <- subset(dados, componente == "RAM")
disco <- subset(dados, componente == "Disco")

medias_maquinas <- aggregate(valor ~ nome_maquina + componente, data = dados, FUN = mean)

matriz_layout <- matrix(c(1, 1, 2, 3), nrow = 2, ncol = 2, byrow = TRUE)
layout(matriz_layout)

# 1: Histórico de Linhas Sequencial ---
par(mar = c(4, 4, 3, 2)) # Ajusta as margens do gráfico
plot(
  1, type = "n", 
  main = "Historico de Uso de Componentes (Leituras Sequenciais)",
  xlab = "Sequencia de Leituras (Tempo)", ylab = "Porcentagem (%)", 
  xlim = c(1, max(c(nrow(cpu), nrow(ram), nrow(disco), 10))), ylim = c(0, 100)
)

if(nrow(cpu) > 0)   lines(1:nrow(cpu), cpu$valor, col = "#ff4d4d", type = "b", pch = 16, lwd = 2)
if(nrow(ram) > 0)   lines(1:nrow(ram), ram$valor, col = "#3399ff", type = "b", pch = 16, lwd = 2)
if(nrow(disco) > 0) lines(1:nrow(disco), disco$valor, col = "#b366ff", type = "b", pch = 16, lwd = 2)

legend("topright", legend = c("CPU", "RAM", "Disco"), col = c("#ff4d4d", "#3399ff", "#b366ff"), lwd = 2, pch = 16, bty = "n")


# 2: Ranking
par(mar = c(4, 4, 3, 2))
if(nrow(medias_maquinas) > 0) {

  nomes_barras <- paste(medias_maquinas$nome_maquina, "\n(", medias_maquinas$componente, ")", sep="")
  
  barplot(
    medias_maquinas$valor,
    names.arg = nomes_barras,
    col = c("#ff4d4d", "#b366ff", "#3399ff")[factor(medias_maquinas$componente)],
    main = "RANKING DE USO - MEDIAS",
    ylab = "Media Calculada (%)",
    ylim = c(0, 100),
    cex.names = 0.8,
    las = 1
  )
  grid(nx = NA, ny = NULL, col = "gray", lty = "dotted") # Linhas de grade de fundo
} else {
  plot.new()
  text(0.5, 0.5, "Sem dados de ranking para exibir.", cex = 1.1)
}


# --- GRÁFICO 3: Ranking de Uso de Disco por Servidor ---
par(mar = c(4, 5, 3, 2)) # Margem esquerda aumentada para caber nomes longos de máquinas

if(nrow(disco) > 0) {
  ranking_disco <- aggregate(valor ~ nome_maquina, data = disco, FUN = mean)
  
  barplot(
    ranking_disco$valor,
    names.arg = ranking_disco$nome_maquina,
    horiz = TRUE,                 
    las = 1,                      
    col = "#3399ff",
    main = "Uso de Disco por Servidor",
    xlab = "Capacidade Utilizada (%)",
    xlim = c(0, 100)
  )
} else {
  plot.new()
  text(0.5, 0.5, "Sem dados de Disco para o Ranking Horizontal")
}

# Restaurar layout padrão do R
layout(1)

