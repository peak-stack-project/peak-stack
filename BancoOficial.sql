DROP DATABASE IF EXISTS banco_peakstack;
CREATE DATABASE banco_peakstack;
USE banco_peakstack;


CREATE TABLE empresa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cnpj CHAR(14) UNIQUE NOT NULL,
    logradouro VARCHAR(150)
);


CREATE TABLE usuario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(70) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    fkEmpresa INT NOT NULL,
    CONSTRAINT fk_usuario_empresa FOREIGN KEY (fkEmpresa) REFERENCES empresa(id)
);


CREATE TABLE cargo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    descricao VARCHAR(150)
);


CREATE TABLE usuario_cargo (
    fkUsuario INT NOT NULL,
    fkCargo INT NOT NULL,
    PRIMARY KEY (fkUsuario, fkCargo),
    CONSTRAINT fk_usuario_cargo_usuario FOREIGN KEY (fkUsuario) REFERENCES usuario(id),
    CONSTRAINT fk_usuario_cargo_cargo FOREIGN KEY (fkCargo) REFERENCES cargo(id)
);


CREATE TABLE maquina_virtual (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nomeMaquina VARCHAR(150) NOT NULL,
    endereco_ip VARCHAR(45),
    memoria_total DECIMAL(10,2),
    disco_total DECIMAL(10,2),
    fkEmpresa INT NOT NULL,
    CONSTRAINT fk_maquina_empresa FOREIGN KEY (fkEmpresa) REFERENCES empresa(id)
);


CREATE TABLE nivel_alerta (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(40) NOT NULL,
    descricao VARCHAR(150)
);


CREATE TABLE metrica_alerta (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fkEmpresa INT NOT NULL,
    fkNivelAlerta INT NOT NULL,
    limite DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_metrica_empresa FOREIGN KEY (fkEmpresa) REFERENCES empresa(id),
    CONSTRAINT fk_metrica_nivel_alerta FOREIGN KEY (fkNivelAlerta) REFERENCES nivel_alerta(id)
);


CREATE TABLE tipo_metrica (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unidadeMedida VARCHAR(20) NOT NULL,
    especificacao VARCHAR(45)
);


CREATE TABLE tipo_componente (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(30) NOT NULL,
    fkTipoMetrica INT NOT NULL,
    CONSTRAINT fk_tipo_componente_metrica FOREIGN KEY (fkTipoMetrica) REFERENCES tipo_metrica(id)
);


CREATE TABLE componente (
    id INT PRIMARY KEY AUTO_INCREMENT,
    coletaAtiva TINYINT(1) NOT NULL DEFAULT 1,
    fkTipoComponente INT NOT NULL,
    fkMetricaAlerta INT NOT NULL,
    CONSTRAINT fk_componente_tipo FOREIGN KEY (fkTipoComponente) REFERENCES tipo_componente(id),
    CONSTRAINT fk_componente_metrica_alerta FOREIGN KEY (fkMetricaAlerta) REFERENCES metrica_alerta(id)
);


CREATE TABLE configuracao_maquina (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fkMaquina INT NOT NULL,
    fkMaquinaComponente INT NOT NULL,
    CONSTRAINT fk_configuracao_maquina FOREIGN KEY (fkMaquina) REFERENCES maquina_virtual(id),
    CONSTRAINT fk_configuracao_componente FOREIGN KEY (fkMaquinaComponente) REFERENCES componente(id)
);


CREATE TABLE leitura (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    valor DECIMAL(10,2) NOT NULL,
    dataHora DATETIME NOT NULL,
    fkMaquinaComponente INT NOT NULL,
    CONSTRAINT fk_leitura_configuracao FOREIGN KEY (fkMaquinaComponente) REFERENCES configuracao_maquina(id)
);


CREATE TABLE alerta (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fkLeitura BIGINT NOT NULL,
    fkMetricaAlerta INT NOT NULL,
    CONSTRAINT fk_alerta_leitura FOREIGN KEY (fkLeitura) REFERENCES leitura(id),
    CONSTRAINT fk_alerta_metrica FOREIGN KEY (fkMetricaAlerta) REFERENCES metrica_alerta(id)
);




INSERT INTO empresa (nome, cnpj, logradouro)
VALUES
('ShowTech Eventos', '12345678000101', 'Av. Paulista, 1000'),
('Live Music Produções', '98765432000199', 'Rua Augusta, 500'),
('Mega Shows Brasil', '45678912000155', 'Av. Ibirapuera, 2500');


INSERT INTO usuario (nome, email, senha, data_nascimento, fkEmpresa)
VALUES
('Helena Caporicci', 'helena@email.com', '123456', '2005-05-15', 1),
('Maria Luiza Silva', 'maria@email.com', '123456', '1998-08-20', 1),
('Gabryel Moura', 'gabryel@email.com', '123456', '2001-03-10', 2),
('Felipe Lambaz', 'felipe@email.com', '123456', '1995-11-25', 3);

INSERT INTO cargo (nome, descricao)
VALUES
('Administrador', 'Responsável pelo gerenciamento da plataforma'),
('Analista', 'Responsável pelo acompanhamento dos computadores'),
('Técnico', 'Responsável pela manutenção dos equipamentos');


INSERT INTO usuario_cargo (fkUsuario, fkCargo)
VALUES
(1, 1),
(2, 2),
(3, 2),
(4, 3);


INSERT INTO maquina_virtual
(nomeMaquina, endereco_ip, memoria_total, disco_total, fkEmpresa)
VALUES
('Servidor-01', '192.168.0.10', 16.00, 500.00, 1),
('Servidor-02', '192.168.0.11', 32.00, 1000.00, 1),
('Servidor-03', '192.168.0.20', 16.00, 500.00, 2),
('Servidor-04', '192.168.0.30', 8.00, 250.00, 3);


INSERT INTO nivel_alerta (nome, descricao)
VALUES
('Normal', 'Funcionamento dentro dos limites esperados'),
('Atenção', 'Métrica próxima do limite crítico'),
('Crítico', 'Métrica acima do limite permitido');


INSERT INTO tipo_metrica (unidadeMedida, especificacao)
VALUES
('%', 'Percentual de utilização'),
('GHz', 'Frequência atual do processador'),
('GB', 'Quantidade de memória'),
('°C', 'Temperatura do componente');


INSERT INTO tipo_componente (nome, fkTipoMetrica)
VALUES
('CPU', 1),
('Memória RAM', 1),
('Disco', 1),
('Rede', 4);


INSERT INTO metrica_alerta
(fkEmpresa, fkNivelAlerta, limite)
VALUES
(1, 1, 50.00),
(1, 2, 70.00),
(1, 3, 85.00),

(2, 1, 50.00),
(2, 2, 75.00),
(2, 3, 90.00),

(3, 1, 50.00),
(3, 2, 70.00),
(3, 3, 85.00);


INSERT INTO componente
(coletaAtiva, fkTipoComponente, fkMetricaAlerta)
VALUES
(1, 1, 1), 
(1, 2, 4), 
(1, 3, 7), 
(1, 4, 9); 


INSERT INTO configuracao_maquina
(fkMaquina, fkMaquinaComponente)
VALUES
(1, 1),
(1, 2), 
(1, 3),
(1, 4),

(2, 1),
(2, 2),
(2, 3),
(2, 4),

(3, 1),
(3, 2),
(3, 3),

(4, 1),
(4, 2),
(4, 3);


INSERT INTO leitura
(valor, dataHora, fkMaquinaComponente)
VALUES

(35.50, '2026-09-17 20:00:00', 1),
(52.30, '2026-09-17 20:00:10', 1),
(78.90, '2026-09-17 20:00:20', 1),
(91.20, '2026-09-17 20:00:30', 1),
(45.00, '2026-09-17 20:00:00', 2),
(62.50, '2026-09-17 20:00:10', 2),
(81.30, '2026-09-17 20:00:20', 2),
(25.00, '2026-09-17 20:00:00', 3),
(65.00, '2026-09-17 20:00:10', 3),
(88.00, '2026-09-17 20:00:20', 3),
(55.00, '2026-09-17 20:00:00', 4),
(72.00, '2026-09-17 20:00:10', 4),
(87.00, '2026-09-17 20:00:20', 4);

INSERT INTO alerta
(fkLeitura, fkMetricaAlerta)
VALUES
(3, 2),
(4, 3),
(6, 5),
(7, 6),
(9, 8),
(10, 9),
(12, 2),
(13, 3);