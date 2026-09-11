DROP DATABASE IF EXISTS dados_computador;
CREATE DATABASE dados_computador;
USE dados_computador;

CREATE TABLE empresa (
    idEmpresa INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cnpj CHAR(14) UNIQUE NOT NULL,
    endereco VARCHAR(150)
);

CREATE TABLE cargo (
    idCargo INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) UNIQUE NOT NULL,
    descricao VARCHAR(150)
);


CREATE TABLE usuario (
    idUsuario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(70) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    fkEmpresa INT NOT NULL,
    FOREIGN KEY (fkEmpresa) REFERENCES empresa(idEmpresa)
);


CREATE TABLE usuario_cargo (
    fkUsuario INT NOT NULL,
    fkCargo INT NOT NULL,
    PRIMARY KEY (fkUsuario, fkCargo),
    FOREIGN KEY (fkUsuario) REFERENCES usuario(idUsuario),
    FOREIGN KEY (fkCargo) REFERENCES cargo(idCargo)
);


CREATE TABLE maquina_virtual (
    idMaquina INT PRIMARY KEY AUTO_INCREMENT,
    nomeMaquina VARCHAR(150) NOT NULL,
    endereco_ip VARCHAR(45),
    memoria_total DECIMAL(10,2),
    disco_total DECIMAL(10,2),
    fkEmpresa INT NOT NULL,
    FOREIGN KEY (fkEmpresa) REFERENCES empresa(idEmpresa)
);


CREATE TABLE tipo_componente (
    idTipoComponente INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(30) UNIQUE NOT NULL,
    descricao VARCHAR(150)
);


CREATE TABLE maquina_componente (
    idMaquinaComponente INT PRIMARY KEY AUTO_INCREMENT,
    fkMaquina INT NOT NULL,
    fkTipoComponente INT NOT NULL,
    coletaAtiva BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (fkMaquina) REFERENCES maquina_virtual(idMaquina),
    FOREIGN KEY (fkTipoComponente) REFERENCES tipo_componente(idTipoComponente)
);

CREATE TABLE especificacao_cpu (
    idCpu INT PRIMARY KEY AUTO_INCREMENT,
    fkMaquinaComponente INT NOT NULL,
    quantidade_nucleos INT,
    quantidade_threads INT,
    frequencia_mhz DECIMAL(10,2),
    FOREIGN KEY (fkMaquinaComponente) REFERENCES maquina_componente(idMaquinaComponente)
);


CREATE TABLE especificacao_ram (
    idRam INT PRIMARY KEY AUTO_INCREMENT,
    fkMaquinaComponente INT NOT NULL,
    capacidade_total_gb DECIMAL(10,2),
    FOREIGN KEY (fkMaquinaComponente) REFERENCES maquina_componente(idMaquinaComponente)
);


CREATE TABLE especificacao_disco (
    idDisco INT PRIMARY KEY AUTO_INCREMENT,
    fkMaquinaComponente INT NOT NULL,
    capacidade_total_gb DECIMAL(10,2),
    FOREIGN KEY (fkMaquinaComponente) REFERENCES maquina_componente(idMaquinaComponente)
);

CREATE TABLE tipo_metrica (
    idTipoMetrica INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) UNIQUE NOT NULL,
    unidadeMedida VARCHAR(20)
);

CREATE TABLE leitura (
    idLeitura BIGINT PRIMARY KEY AUTO_INCREMENT,
    fkMaquinaComponente INT NOT NULL,
    fkTipoMetrica INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    dataHora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fkMaquinaComponente) REFERENCES maquina_componente(idMaquinaComponente),
    FOREIGN KEY (fkTipoMetrica) REFERENCES tipo_metrica(idTipoMetrica)
);


CREATE TABLE alerta (
    idAlerta INT PRIMARY KEY AUTO_INCREMENT,
    fkLeitura BIGINT NOT NULL,
    tipo_alerta VARCHAR(50) NOT NULL,
    nivel VARCHAR(20) NOT NULL,
    mensagem VARCHAR(255),
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ATIVO',
    FOREIGN KEY (fkLeitura) REFERENCES leitura(idLeitura)
);


CREATE TABLE metrica_funil (
    idMetrica INT PRIMARY KEY AUTO_INCREMENT,
    etapa_funil VARCHAR(50) NOT NULL,
    fkUsuario INT NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fkUsuario) REFERENCES usuario(idUsuario)
);



INSERT INTO empresa (nome, cnpj, endereco) VALUES
('Empresa Teste', '12345678000100', 'São Paulo - SP');


INSERT INTO cargo (nome, descricao) VALUES
('Administrador', 'Acesso administrativo ao sistema'),
('Analista', 'Responsável pela análise dos dados'),
('Tecnico', 'Responsável pelo monitoramento técnico'),
('Comum', 'Usuário comum do sistema');


INSERT INTO tipo_componente (nome, descricao) VALUES
('CPU', 'Processador da máquina'),
('RAM', 'Memória RAM da máquina'),
('DISCO', 'Armazenamento da máquina');


INSERT INTO usuario (nome, email, senha, data_nascimento, fkEmpresa) VALUES
('Usuario Teste', 'usuario@email.com', '123456', '2000-01-01', 1);


INSERT INTO usuario_cargo (fkUsuario, fkCargo) VALUES
(1, 1);

INSERT INTO tipo_metrica (nome, unidadeMedida)
VALUES
('Uso da CPU', '%'),
('Frequência da CPU', 'MHz'),
('Memória total', 'GB'),
('Memória utilizada', 'GB'),
('Memória disponível', 'GB'),
('Percentual da memória utilizada', '%'),
('Percentual da memória disponível', '%'),
('Disco total', 'GB'),
('Disco utilizado', 'GB'),
('Disco disponível', 'GB'),
('Percentual do disco utilizado', '%'),
('Percentual do disco disponível', '%');


----- EXEMPLO INSERT INTO alerta (fkLeitura, tipo_alerta, nivel, mensagem, status) VALUES
----- (1,'Uso de CPU', 'NORMAL', 'Uso da CPU dentro do limite esperado','RESOLVIDO');		