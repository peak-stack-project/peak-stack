CREATE DATABASE projeto_moda;
USE projeto_moda;



-- criei a tabela usuario para receber as informações dos cadastros e coloquei o tipo para diferenciar quem é usuario comum e quem é admin 
-- coloquei data de nascimento e genero para usar no funil de conversão, para mostrar a porcentagem de homens e mulheres que visitam o site
-- 
CREATE TABLE usuario (
	id INT PRIMARY KEY AUTO_INCREMENT,
	nome VARCHAR(100) NOT NULL,
	email VARCHAR(70) UNIQUE NOT NULL,
	senha VARCHAR(30) NOT NULL,
	tipo VARCHAR(20) DEFAULT 'comum',
	data_nascimento date NOT NULL,
	genero varchar(1) not null
);

-- A tabela metrica_funil será usada para armazenar os dados coletados dentro do site, 
-- como os cliques em botões e visitas em páginas, e será usada para gerar a dashboard
-- 
CREATE TABLE metrica_funil (
	id INT PRIMARY KEY AUTO_INCREMENT,
	etapa_funil VARCHAR(50) NOT NULL,
	fk_usuario INT, 
	data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_usuario FOREIGN KEY (fk_usuario) REFERENCES usuario(id)
);


CREATE TABLE marca(
	idmarca INT PRIMARY KEY AUTO_INCREMENT,
	nome VARCHAR(100) NOT NULL, -- marca ou artista
	descricao VARCHAR(600)
);

INSERT INTO marca (nome, descricao) VALUES 
('Vitonez','A Vitonez traduz a moda como expressão de identidade, memória e pertencimento. Inspirada pela cultura brasileira e sul-americana, a marca valoriza histórias, símbolos e afetos que fazem parte do nosso cotidiano, criando peças com propósito, conforto e autenticidade.Em oposição ao ritmo acelerado do fast fashion, suas coleções celebram a produção consciente, os pequenos produtores e a força criativa da nossa região. Cada peça carrega uma estética urbana, afetiva e artesanal, conectando moda, cultura e responsabilidade.' ),
('Agustina Comas','Agustina Comas é uma designer uruguaia radicada em São Paulo e referência em upcycling industrial e moda circular. Seu trabalho mostra que sobras, peças paradas e resíduos têxteis podem voltar ao ciclo como matéria-prima de criação.Com o Método Comas, ela transforma reaproveitamento em processo de design: cria a partir do que já existe, valoriza conhecimento técnico e propõe uma moda mais inteligente, menos descartável e mais consciente sobre quem faz.' ),
('Flavia Aranha','Flavia Aranha construiu sua marca em torno do tingimento natural, pesquisando cores a partir de plantas, minerais e matérias-primas ligadas aos biomas brasileiros. Seu trabalho aproxima moda, natureza e saber artesanal. Em vez de tratar a cor como acabamento industrial invisível, a marca mostra que tingir também é conhecimento, tempo e experimentação. É uma entrada forte para discutir sustentabilidade como processo, não apenas como aparência.' ),
('Karkaras','Karkarás é um ateliê e studio de tatuagem em Ribeirão Pires, formado por artistas que se aproximam pelo trabalho manual, pela criatividade e pela vontade de transformar ideias em prática. O espaço reúne tatuagem, costura e experimentação, valorizando o processo tanto quanto o resultado. Entre rascunhos, decalques, estudos de tecido, modelagem, corte e costura, a marca mostra que criar exige tempo, técnica e atenção às etapas. Mais do que produzir peças ou tatuagens, a Karkarás funciona como um coletivo que busca melhorar o meio em que atua e fortalecer quem faz parte dele.' );


CREATE TABLE vitrine_marcas(
	id INT PRIMARY KEY AUTO_INCREMENT,
	fk_usuario INT NOT NULL,
	data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
	grau_interesse INT(10) NOT NULL, -- 0~10
	ja_conhecia CHAR(1) NOT NULL, -- 'S' para Sim (Conhecia), 'N' para Não (Não conhecia)
	fk_marca INT NOT NULL,
	
	
	CONSTRAINT chk_grau_interesse CHECK (grau_interesse >= 0 AND grau_interesse <= 10),
	CONSTRAINT chk_ja_conhecia CHECK (ja_conhecia IN ('S', 'N')),

	CONSTRAINT fk_vitrine_usuario FOREIGN KEY (fk_usuario) REFERENCES usuario(id),
	CONSTRAINT fk_vitrine_marca FOREIGN KEY (fk_marca) REFERENCES marca(idmarca)
);


-- Insere um administrador no banco de dados, ele terá acesso a dahsboard, diferente dos clientes que serão apenas usuários comuns
-- 
INSERT INTO usuario (nome, email, senha, tipo, data_nascimento, genero) VALUES 
('Administrador', 'admin', '6568716d72', 'admin', '2000-01-01', 'N');

SELECT * FROM usuario;

