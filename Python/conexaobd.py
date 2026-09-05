import mysql.connector
import getpass


mydb = mysql.connector.connect(
    host="localhost",
    user="aluno",
    password=getpass.getpass("Insira a senha do banco de dados: "),
    database="dados_computador"
)

mycursor = mydb.cursor()