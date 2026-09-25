CREATE DATABASE IF NOT EXISTS db_peakstack;
USE db_peakstack;
CREATE TABLE IF NOT EXISTS db_peakstack.empresa (
  id INT PRIMARY KEY AUTO_INCREMENT NOT NULL ,
  razao_social VARCHAR(45) NOT NULL,
  nome_fantasia VARCHAR(45) NOT NULL,
  cnpj CHAR(14) NOT NULL,
  dt_hr DATETIME NOT NULL
  );

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
  dt_criacao DATE NOT NULL,
  empresa_id INT NOT NULL,
  PRIMARY KEY (id, empresa_id),
  CONSTRAINT fk_maquina_empresa
    FOREIGN KEY (empresa_id)
    REFERENCES db_peakstack.empresa (id)
    );

CREATE TABLE IF NOT EXISTS db_peakstack.componentes (
  id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
  nome VARCHAR(45) NOT NULL,
  tipo VARCHAR(45) NOT NULL,
  unidade_medida VARCHAR(45) NOT NULL,
  biblioteca VARCHAR(45) NOT NULL,
  codigo VARCHAR(45) NOT NULL
);

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

