import mysql.connector
import getpass


print(mysql.connector.__version__)

mydb = mysql.connector.connect(
  host="localhost",
  user="root",
  password=getpass.getpass("Insira a senha: "),
  database ="dados_computador"
)

mycursor = mydb.cursor()



# mycursor.execute(comandos_sql)

print("Banco de dados e tabelas criados com sucesso!")

