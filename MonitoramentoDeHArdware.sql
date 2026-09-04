DROP DATABASE IF EXISTS dados_computador;
CREATE DATABASE IF NOT EXISTS dados_computador;

USE dados_computador;

CREATE TABLE IF NOT EXISTS usuario (
	id INT PRIMARY KEY AUTO_INCREMENT,
	nome VARCHAR(100) NOT NULL,
	email VARCHAR(70) UNIQUE NOT NULL,
	senha VARCHAR(30) NOT NULL,
	tipo VARCHAR(20) DEFAULT 'comum',
	data_nascimento date NOT NULL,
	genero varchar(1) not null
);

CREATE TABLE metrica_funil (
	id INT PRIMARY KEY AUTO_INCREMENT,
	etapa_funil VARCHAR(50) NOT NULL,
	fk_usuario INT, 
	data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_usuario FOREIGN KEY (fk_usuario) REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS empresa (
    idEmpresa INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cnpj CHAR(14) UNIQUE NOT NULL,
    endereco VARCHAR(100)
);

CREATE TABLE servidor (
idServidor INT PRIMARY KEY AUTO_INCREMENT,
Localizacao VARCHAR(100)  /*NOT NULL*/,
fkEmpresa INT, CONSTRAINT fk_empresa_servidor FOREIGN KEY (fkEmpresa) REFERENCES empresa(idEmpresa)
);
INSERT INTO servidor (idServidor,Localizacao ) VALUES (1, "saopaulo");

CREATE TABLE IF NOT EXISTS maquinas_virtuais (
    idMaquina INT PRIMARY KEY AUTO_INCREMENT,
    nomeMaquina VARCHAR(150) NOT NULL,
    nucleosFisicos INT,
    processadoresLogicos INT,
    frequenciaMaxima DECIMAL(10,2),
    memoriaTotal DECIMAL(10,2),
    discoTotal DECIMAL(10,2),
    fkServidor INT NOT NULL,
    FOREIGN KEY (fkServidor) REFERENCES servidor(idServidor)
);

INSERT INTO maquinas_virtuais (nomeMaquina,fkServidor ) VALUES ("maquina de teste", 1);


CREATE TABLE IF NOT EXISTS leituras (
    idLeitura INT PRIMARY KEY AUTO_INCREMENT,
    usoCpu DECIMAL(5,2),
    frequenciaAtual DECIMAL(10,2),
    memoriaDisponivel DECIMAL(10,2),
    memoriaUtilizada DECIMAL(10,2),
    percentualMemoria DECIMAL(5,2),
    discoLivre DECIMAL(10,2),
    discoUtilizado DECIMAL(10,2),
    percentualDisco DECIMAL(5,2),
    dataHora DATETIME DEFAULT CURRENT_TIMESTAMP,
    fkMaquina INT NOT NULL,
	FOREIGN KEY (fkMaquina) REFERENCES maquinas_virtuais(idMaquina)
);

SELECT * FROM leituras;
