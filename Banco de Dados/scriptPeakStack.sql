CREATE SCHEMA IF NOT EXISTS db_peakstack;
USE db_peakstack;

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
  id INT auto_increment UNIQUE,
  fk_empresa INT NOT NULL,
  fk_cargo INT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  email VARCHAR(45) NOT NULL,
  senha VARCHAR(45) NOT NULL,
  dt_nasc DATE,
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
  id INT auto_increment UNIQUE,
  fk_empresa INT NOT NULL,
  fk_so INT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  mac_address CHAR(12) NOT NULL,
  created_at DATETIME DEFAULT current_timestamp,
  updated_by VARCHAR(60) NOT NULL,
  updated_at DATETIME DEFAULT current_timestamp,
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
  id INT AUTO_INCREMENT UNIQUE,
  fk_configuracao_comp INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  PRIMARY KEY (id, fk_configuracao_comp),
  CONSTRAINT fk_componentes_configuracao_comp1
    FOREIGN KEY (fk_configuracao_comp)
    REFERENCES configuracao_comp (id)
    );
    
CREATE TABLE IF NOT EXISTS config_maq (
  id INT AUTO_INCREMENT UNIQUE,
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
  id INT AUTO_INCREMENT UNIQUE,
  valor DECIMAL(5,2) NOT NULL,
  dt_hr_leitura DATETIME DEFAULT current_timestamp,
  fk_config_maq INT NOT NULL,
  PRIMARY KEY (id, fk_config_maq),
  CONSTRAINT fk_leitura_config_maq
    FOREIGN KEY (fk_config_maq)
    REFERENCES config_maq (id)
);

CREATE TABLE IF NOT EXISTS limites (
  id INT auto_increment,
  nivel INT NOT NULL,
  valor_min  DECIMAL(5,2) NOT NULL,
  valor_max  DECIMAL(5,2) NOT NULL,
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
    consciente TINYINT DEFAULT FALSE,
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
-- insert da empresa --
INSERT INTO db_peakstack.empresa (razao_social, nome_fantasia, cnpj) VALUES
('PeakStack Soluções em Infraestrutura de TI LTDA','PeakStack',12345678963541);

SELECT * FROM empresa;
-- insert do cargo--
INSERT INTO cargo (nome, descricao)
VALUES
('Administrador', 'Responsável pelo gerenciamento da plataforma'),
('Visualizador', 'Responsável pelo acompanhamento dos computadores'),
('Operador', 'Responsável pela manutenção dos equipamentos'),
('Adm PeakStack', 'Responsável por cadastrar empresas.');

-- insert do so--
INSERT INTO so (nome, versao, descricao) VALUES
('Windows 11 Home Single Language', '25H2', '      '),
('Linux Ubuntu Server', '26.4', '');

-- insert da máquina--
INSERT INTO db_peakstack.maquina (nome, mac_address, updated_by ,fk_so, fk_empresa) VALUES
('Cliente', '0EFFE89A6BF1','Beatriz', 2, 1),
('Beatriz','A085271564DB','Beatriz', '1', '1'),
('Enzo','DC215CF245A9','Beatriz', '1', '1');
  
SELECT * FROM maquina;

-- insert da configuracao dos componentes --
INSERT INTO db_peakstack.configuracao_comp (tipo, unidade_medida, biblioteca, codigo) VALUES
('CPU', '%', 'psutil', 'cpu_percent(interval=0.1)'),
('CPU', 'MH', 'psutil', 'cpu_freq().current'),
('RAM', '%', 'psutil', 'virtual_memory().percent'),
('RAM', 'GB', 'psutil', 'virtual_memory().total'),
('Disco', '%', 'psutil', 'disk_usage("C:/").percent'),
('Rede', 'MB', 'psutil', 'net_io_counters().bytes_recv');

INSERT INTO configuracao_comp (tipo, unidade_medida, biblioteca, codigo) VALUES
('Rede', 'MB',   'psutil', 'net_io_counters().bytes_sent'),   -- upload total
('Rede', 'Mbps', 'psutil', 'delta bytes_recv (Mbps)');   	     -- velocidade de download

SELECT * FROM configuracao_comp;

-- insert dos componentes -- 
INSERT INTO db_peakstack.componentes  (nome, fk_configuracao_comp) VALUES
('13th Gen Intel(R) Core(TM) i5-13420H (2.10 GHz)', 1),
('13th Gen Intel(R) Core(TM) i5-13420H (2.10 GHz)', 2),
('DDR5', 3),
('DDR5', 4),
('SAMSUNG MZAMX512HCLV-00BL2', 5),
('Intel(R) Wi-Fi 6 AX201 160MHz', 6);

INSERT INTO db_peakstack.componentes  (nome, fk_configuracao_comp) VALUES
('Intel(R) Xeon(R) Platinum 8259CL CPU @ 2.50GHz', 1),
('Intel(R) Xeon(R) Platinum 8259CL CPU @ 2.50GHz', 2),
('DDR4', 3),
('DDR4', 4),
('Amazon Elastic Block Store', 5),
('Amazon.com, Inc. Elastic Network Adapter (ENA)', 6);

SELECT * FROM componentes;

-- Insert de Usuário:
INSERT INTO usuario (fk_empresa, fk_cargo, nome, email, senha, updated_by, dt_nasc) VALUES
(1, 1, 'Beatriz', 'beatriz@peakstack.com', 'Peakstack@123456', 'Beatriz', '2007-08-14'),
(1, 4, 'Felipe Dias', 'felipe@peakstack.com', 'Peakstack@123456', 'Beatriz', '2008-07-07');

SELECT * FROM usuario;
-- insert da configuração da maquina --
INSERT INTO config_maq (fk_componentes, fk_maquina, status_config) VALUES
(7, 1, 'Ativo'),
(8, 1, 'Pendente'),
(9, 1, 'Ativo'),
(10, 1, 'Ativo'),
(11, 1, 'Não Ativo'),
(12, 1, 'Ativo');

select * from config_maq;

SELECT cm.id AS cm_id,
           cm.fk_componentes,
           m.fk_empresa,
           c.nome,
           cc.unidade_medida,
           cc.biblioteca,
           cc.codigo
    FROM maquina m
    JOIN config_maq cm    ON cm.fk_maquina = m.id
    JOIN componentes c          ON c.id = cm.fk_componentes
    JOIN configuracao_comp cc   ON cc.id = c.fk_configuracao_comp
    WHERE UPPER(m.mac_address) = '2AF2A12F1D90'
      AND cm.status_config = 'Ativo';


-- LEITURA:
SELECT
	l.id AS leitura_id,
    m.nome AS nome_maquina,
    l.valor AS valor_leitura,
    cc.unidade_medida AS unidade_medida,
    l.dt_hr_leitura AS data_hora_leitura,
    d.situacao AS situacao_leitura,
    d.descricao AS descricao_discretizacao,
    d.consciente AS consciente,
    cc.tipo AS tipo_componente,
	c.nome AS nome_componente,
	cm.id AS config_maquina_id
FROM leitura l
INNER JOIN config_maq cm
    ON cm.id = l.fk_config_maq
INNER JOIN componentes c
    ON c.id = cm.fk_componentes
INNER JOIN configuracao_comp cc
    ON cc.id = c.fk_configuracao_comp
INNER JOIN maquina m
    ON m.id = cm.fk_maquina
LEFT JOIN discretizada d
    ON d.fk_leitura = l.id
ORDER BY l.dt_hr_leitura DESC;


