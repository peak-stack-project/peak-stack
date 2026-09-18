import mysql.connector
import getpass


mydb = mysql.connector.connect(
    host="localhost",
    user="aluno",
    password= "sptech",
    database="dados_computador"
)

mycursor = mydb.cursor()