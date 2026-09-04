DROP DATABASE IF EXISTS dados_computador;
CREATE DATABASE IF NOT EXISTS dados_computador;

USE dados_computador;

CREATE TABLE IF NOT EXISTS empresa (
    idEmpresa INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cnpj CHAR(14) UNIQUE NOT NULL,
    endereco VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS usuario (
	idUsuario INT PRIMARY KEY AUTO_INCREMENT,
	nome VARCHAR(100) NOT NULL,
	email VARCHAR(70) UNIQUE NOT NULL,
	senha VARCHAR(30) NOT NULL,
	tipo VARCHAR(20) DEFAULT 'comum',
	data_nascimento date NOT NULL,
    fkEmpresa int,
    FOREIGN KEY (fkEmpresa) REFERENCES empresa(idEmpresa)
);

CREATE TABLE metrica_funil (
	idMetrica INT PRIMARY KEY AUTO_INCREMENT,
	etapa_funil VARCHAR(50) NOT NULL,
	fk_usuario INT, 
	data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
	fkUsuario int,
    FOREIGN KEY (fkUsuario) REFERENCES usuario(idUsuario)
);

CREATE TABLE IF NOT EXISTS maquinas_virtuais (
    idMaquina INT PRIMARY KEY AUTO_INCREMENT,
    nomeMaquina VARCHAR(150) NOT NULL,
    memoriaTotal DECIMAL(10,2),
    discoTotal DECIMAL(10,2),
    fkEmpresa int,
    fkUsuario int,
    FOREIGN KEY (fkUsuario) REFERENCES usuario(idUsuario),
    FOREIGN KEY (fkEmpresa) REFERENCES empresa(idEmpresa)
);

INSERT INTO maquinas_virtuais (nomeMaquina) VALUES ("maquina de teste");

CREATE TABLE componentes(
idComponente INT PRIMARY KEY AUTO_INCREMENT,
componente VARCHAR(30),
unidadeMedida VARCHAR(15),
Expecificacao VARCHAR(15),
fkMaquina int,
FOREIGN KEY (fkMaquina) REFERENCES maquinas_virtuais(idmaquina)
);

CREATE TABLE IF NOT EXISTS leituras (
	idLeitura INT PRIMARY KEY AUTO_INCREMENT,
    fkComponente INT,
	FOREIGN KEY (fkComponente) REFERENCES componentes (idComponente)
);

CREATE TABLE alertas(
idComponenteEq INT PRIMARY KEY AUTO_INCREMENT,
gatilhoAlerta INT,
fkComponente int,
fkLeitura int,
FOREIGN KEY (fkComponente) REFERENCES componentes (idComponente),
FOREIGN KEY (fkLeitura) REFERENCES leituras (idLeitura));

SELECT * FROM leituras;
