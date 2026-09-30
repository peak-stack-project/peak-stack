CREATE DATABASE IF NOT EXISTS db_peakstack;
USE db_peakstack;
CREATE TABLE IF NOT EXISTS db_peakstack.empresa (
  id INT PRIMARY KEY AUTO_INCREMENT NOT NULL ,
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(45) NOT NULL,
  cnpj CHAR(14) NOT NULL,
  dt_hr  DATETIME DEFAULT current_timestamp
);
  
INSERT INTO db_peakstack.empresa (razao_social, nome_fantasia, cnpj) VALUES
('PeakStack Soluções em Infraestrutura de TI LTDA','PeakStack',12345678963541);

CREATE TABLE IF NOT EXISTS db_peakstack.usuario (
  id INT AUTO_INCREMENT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  email VARCHAR(45) NOT NULL,
  senha VARCHAR(45) NOT NULL,
  cargo VARCHAR(45) NOT NULL,
  empresa_id INT NOT NULL,
  PRIMARY KEY (id, empresa_id),
  CONSTRAINT fk_usuario_empresa
    FOREIGN KEY (empresa_id)
    REFERENCES db_peakstack.empresa (id)
);

CREATE TABLE IF NOT EXISTS db_peakstack.maquina(
  id INT AUTO_INCREMENT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  mac_adress CHAR(12) NOT NULL,
  so VARCHAR(45) NOT NULL,
  dtHr_criacao DATETIME DEFAULT current_timestamp,
  empresa_id INT NOT NULL,
  PRIMARY KEY (id, empresa_id),
  CONSTRAINT fk_maquina_empresa
    FOREIGN KEY (empresa_id)
    REFERENCES db_peakstack.empresa (id)
);

INSERT INTO db_peakstack.maquina (nome, mac_adress, so, empresa_id) VALUES
('Beatriz','A085271564DB', 'windows', '1');
    
CREATE TABLE IF NOT EXISTS db_peakstack.componentes (
  id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  tipo VARCHAR(45) NOT NULL,
  unidade_medida VARCHAR(45) NOT NULL,
  biblioteca VARCHAR(45) NOT NULL,
  codigo VARCHAR(45) NOT NULL
);

INSERT INTO db_peakstack.componentes (nome, tipo, unidade_medida, biblioteca, codigo) VALUES
('CPU', 'Uso', '%', 'psutil', 'cpu_percent(interval=0.1)'),
('CPU', 'Frequencia', 'MH', 'psutil', 'cpu_freq().current'),
('RAM', 'Uso', '%', 'psutil', 'virtual_memory().percent'),
('RAM', 'Total', 'GB', 'psutil', 'virtual_memory().total'),
('Disco', 'Uso', '%', 'psutil', 'disk_usage("C:/").percent'),
('Rede', 'Downloas', 'MB', 'psutil', 'net_io_counters().bytes_recv');

CREATE TABLE IF NOT EXISTS db_peakstack.componentes_maquina (
  id INT AUTO_INCREMENT NOT NULL,
  componentes_id INT NOT NULL,
  maquina_id INT NOT NULL,
  ativo TINYINT NOT NULL,
  PRIMARY KEY (id, componentes_id, maquina_id),
  CONSTRAINT fk_cm_componentes
    FOREIGN KEY (componentes_id)
    REFERENCES db_peakstack.componentes (id),
  CONSTRAINT fk_cm_maquina
	FOREIGN KEY (maquina_id)
    REFERENCES db_peakstack.maquina (id)
);

INSERT INTO db_peakstack.componentes_maquina (componentes_id, maquina_id, ativo) VALUES
(1, 2, True),
(2, 2, True),
(3, 2, True),
(5, 2, True);

-- Isso aqui foi porque eu quis testar quando colocasse algum componente como False:
UPDATE db_peakstack.componentes_maquina SET ativo = False WHERE id = 6;

CREATE TABLE IF NOT EXISTS db_peakstack.leitura (
  id INT AUTO_INCREMENT NOT NULL,
  valor DECIMAL NOT NULL,
  dt_hr DATETIME NOT NULL,
  situacao VARCHAR(45) NOT NULL,
  componentes_maquina_id INT NOT NULL,
  PRIMARY KEY (id, componentes_maquina_id),
  CONSTRAINT fk_leitura_cm
    FOREIGN KEY (componentes_maquina_id)
    REFERENCES db_peakstack.componentes_maquina (id)
);

CREATE TABLE IF NOT EXISTS db_peakstack.limites (
  id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
  nivel INT NOT NULL,
  valor_min DECIMAL NOT NULL,
  valor_max DECIMAL NOT NULL,
  componentes_id INT NOT NULL,
  CONSTRAINT fk_limites_componentes
    FOREIGN KEY (componentes_id)
    REFERENCES db_peakstack.componentes (id)
);

CREATE VIEW vw_leitura_maquina AS 
SELECT l.id AS 'Número da Leitura', l.dt_Hr as 'Data e HOra', m.nome as 'Nome da Maquina', c.nome as 'Nome Do Componente', concat(valor,' ',unidade_medida) as Valor, tipo as 'Tipo de Leitura' FROM leitura as l 	
join componentes_maquina as cm ON cm.id = l.componentes_maquina_id
JOIN componentes as c ON c.id = cm.componentes_id
JOIN maquina as m ON  m.id = cm.maquina_id ;

SELECT * FROM vw_leitura_maquina;