
CREATE SCHEMA IF NOT EXISTS db_peakstack;
USE db_peakstack ;

CREATE TABLE IF NOT EXISTS empresa (
  id INT PRIMARY KEY AUTO_INCREMENT,
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200) NOT NULL,
  cnpj CHAR(14) NOT NULL,
  dt_hr_criacao DATETIME default current_timestamp
  );

CREATE TABLE IF NOT EXISTS endereco (
	id INT PRIMARY KEY auto_increment,
    logradouro VARCHAR(60),
    numero VARCHAR(20),
    CEP CHAR(8),
    fk_empresa INT,
    CONSTRAINT fk_endereco_empresa 
		FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id)
  );
  
  CREATE TABLE IF NOT EXISTS cargo (
	id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(45),
    descricao VARCHAR(200)
    );

CREATE TABLE IF NOT EXISTS usuario (
  id INT auto_increment,
  fk_empresa INT NOT NULL,
  fk_cargo INT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  email VARCHAR(45) NOT NULL,
  senha VARCHAR(45) NOT NULL,
  created_at DATETIME DEFAULT current_timestamp,
  updated_by VARCHAR(60) NOT NULL,
  updated_at DATETIME DEFAULT current_timestamp,
  PRIMARY KEY (id, fk_empresa),
  CONSTRAINT fk_usuario_empresa
    FOREIGN KEY (fk_empresa)
    REFERENCES empresa (id),
  CONSTRAINT fk_usuario_cargo
    FOREIGN KEY (fk_cargo)
    REFERENCES cargo (id)
    );
    
CREATE TABLE IF NOT EXISTS so (
	id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50),
    versao VARCHAR(45),
    descricao VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS maquina (
  id INT auto_increment,
  fk_empresa INT NOT NULL,
  fk_so INT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  mac_address CHAR(12) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  updated_by VARCHAR(60) NOT NULL,
  PRIMARY KEY (id, fk_empresa),
  CONSTRAINT fk_maquina_empresa1
    FOREIGN KEY (fk_empresa)
    REFERENCES empresa (id),
  CONSTRAINT fk_maquina_so
    FOREIGN KEY (fk_so)
    REFERENCES so (id)
);

CREATE TABLE IF NOT EXISTS configuracao_comp (
	id INT PRIMARY KEY AUTO_INCREMENT,
    tipo VARCHAR(45),
    unidade_medida VARCHAR(45),
    biblioteca VARCHAR (45),
    codigo VARCHAR(45)
);

CREATE TABLE IF NOT EXISTS componentes (
  id INT AUTO_INCREMENT,
  fk_configuracao_comp INT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  PRIMARY KEY (id, fk_configuracao_comp),
  CONSTRAINT fk_componentes_configuracao_comp1
    FOREIGN KEY (fk_configuracao_comp)
    REFERENCES configuracao_comp (id)
    );
    
CREATE TABLE IF NOT EXISTS config_maq (
  id INT NOT NULL,
  fk_componentes INT NOT NULL,
  fk_maquina INT NOT NULL,
  status_config VARCHAR(60) NOT NULL,
  PRIMARY KEY (id, fk_componentes, fk_maquina),
  CONSTRAINT fk_config_maq_comp
    FOREIGN KEY (fk_componentes)
    REFERENCES componentes (id),
  CONSTRAINT fk_config_maq_maq
    FOREIGN KEY (fk_maquina)
    REFERENCES maquina(id)
);

CREATE TABLE IF NOT EXISTS leitura (
  id INT AUTO_INCREMENT,
  valor DECIMAL NOT NULL,
  dt_hr_leitura DATETIME DEFAULT current_timestamp,
  fk_config_maq INT NOT NULL,
  PRIMARY KEY (id, fk_config_maq),
  CONSTRAINT fk_leitura_config_maq
    FOREIGN KEY (fk_config_maq)
    REFERENCES config_maq (id)
);

CREATE TABLE IF NOT EXISTS limites (
  id INT NOT NULL,
  nivel INT NOT NULL,
  valor_min DECIMAL NOT NULL,
  valor_max DECIMAL NOT NULL,
  fk_componentes INT NOT NULL,
  fk_empresa INT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_limites_componentes
  FOREIGN KEY (fk_componentes)
    REFERENCES componentes(id),
  CONSTRAINT fk_limites_empresa
    FOREIGN KEY (fk_empresa)
    REFERENCES empresa (id)
);
    
CREATE TABLE IF NOT EXISTS discretizada (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fk_leitura INT,
    situacao VARCHAR(45),
    descricao VARCHAR(100),
    consciente TINYINT,
    CONSTRAINT fk_disc_leitura
		FOREIGN KEY (fk_leitura)
        REFERENCES leitura(id)
);
    
CREATE TABLE IF NOT EXISTS slack (
	id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(45),
    descricao VARCHAR(200),
    canal VARCHAR(100),
    fk_empresa INT,
    CONSTRAINT fk_slack_empresa
		FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id)
);

-- INSERTS --
INSERT INTO db_peakstack.empresa (razao_social, nome_fantasia, cnpj) VALUES
('PeakStack Soluções em Infraestrutura de TI LTDA','PeakStack',12345678963541);

INSERT INTO cargo (nome, descricao)
VALUES
('Administrador', 'Responsável pelo gerenciamento da plataforma'),
('Visualizador', 'Responsável pelo acompanhamento dos computadores'),
('Operador', 'Responsável pela manutenção dos equipamentos');
