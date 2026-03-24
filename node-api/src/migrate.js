// =====================================================
// 🗄️ Script de Migration — Cria o banco e todas as tabelas
// Uso: npm run migrate
// =====================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function migrate() {
    // Conecta SEM especificar banco (para poder criá-lo)
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        multipleStatements: true,
    });

    const dbName = process.env.DB_NAME || 'hortas_db';

    console.log(`🔧 Criando banco de dados "${dbName}"...`);

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);

    console.log('📦 Criando tabelas...\n');

    // --- produtos ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id_produto INT AUTO_INCREMENT PRIMARY KEY,
      nm_produto VARCHAR(100) NOT NULL UNIQUE,
      descricao VARCHAR(255),
      unidade_medida_padrao ENUM('g','kg','ton','unidade')
    )
  `);
    console.log('  ✅ produtos');

    // --- endereco_hortas ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS endereco_hortas (
      id_endereco_hortas INT AUTO_INCREMENT PRIMARY KEY,
      nm_rua VARCHAR(50),
      nr_cep VARCHAR(8),
      nm_bairro VARCHAR(50),
      nm_estado CHAR(2),
      nm_cidade VARCHAR(50),
      nm_pais VARCHAR(20) DEFAULT 'Brasil'
    )
  `);
    console.log('  ✅ endereco_hortas');

    // --- produtor ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS produtor (
      id_produtor INT AUTO_INCREMENT PRIMARY KEY,
      hortas_id_hortas INT,
      nome_produtor VARCHAR(50),
      telefone_produtor VARCHAR(15),
      hash_senha VARCHAR(255),
      email_produtor VARCHAR(50) UNIQUE,
      nr_cpf VARCHAR(11) UNIQUE,
      chave_pix VARCHAR(100) DEFAULT NULL,
      endereco_produtor VARCHAR(255) DEFAULT NULL,
      exibir_telefone TINYINT(1) DEFAULT 1,
      exibir_endereco TINYINT(1) DEFAULT 1,
      exibir_pix TINYINT(1) DEFAULT 1
    )
  `);
    console.log('  ✅ produtor');

    // --- hortas ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS hortas (
      id_hortas INT AUTO_INCREMENT PRIMARY KEY,
      endereco_hortas_id_endereco_hortas INT,
      produtor_id_produtor INT,
      nr_cnpj VARCHAR(14) UNIQUE,
      nome VARCHAR(50),
      descricao VARCHAR(255),
      visibilidade INT(1),
      receitas_geradas BIGINT,
      CONSTRAINT fk_hortas_endereco FOREIGN KEY (endereco_hortas_id_endereco_hortas)
        REFERENCES endereco_hortas(id_endereco_hortas)
        ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_hortas_produtor FOREIGN KEY (produtor_id_produtor)
        REFERENCES produtor(id_produtor)
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
    console.log('  ✅ hortas');

    // --- estoques ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS estoques (
      id_estoques INT AUTO_INCREMENT PRIMARY KEY,
      hortas_id_hortas INT,
      produto_id_produto INT,
      ds_quantidade DECIMAL(10,2),
      dt_validade DATE,
      dt_colheita DATE,
      dt_plantio DATE,
      CONSTRAINT fk_estoques_hortas FOREIGN KEY (hortas_id_hortas)
        REFERENCES hortas(id_hortas)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_estoques_produtos FOREIGN KEY (produto_id_produto)
        REFERENCES produtos(id_produto)
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
    console.log('  ✅ estoques');

    // --- entradas_estoque ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS entradas_estoque (
      id_entrada INT AUTO_INCREMENT PRIMARY KEY,
      estoques_id_estoques INT,
      produtor_id_produtor INT,
      dt_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
      quantidade DECIMAL(10,2) NOT NULL,
      motivo VARCHAR(255),
      CONSTRAINT fk_entradas_estoques FOREIGN KEY (estoques_id_estoques)
        REFERENCES estoques(id_estoques)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_entradas_produtor FOREIGN KEY (produtor_id_produtor)
        REFERENCES produtor(id_produtor)
        ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
    console.log('  ✅ entradas_estoque');

    // --- saidas_estoque ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS saidas_estoque (
      id_saida INT AUTO_INCREMENT PRIMARY KEY,
      estoques_id_estoques INT,
      produtor_id_produtor INT,
      dt_saida DATETIME DEFAULT CURRENT_TIMESTAMP,
      quantidade DECIMAL(10,2) NOT NULL,
      motivo VARCHAR(255),
      CONSTRAINT fk_saidas_estoques FOREIGN KEY (estoques_id_estoques)
        REFERENCES estoques(id_estoques)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_saidas_produtor FOREIGN KEY (produtor_id_produtor)
        REFERENCES produtor(id_produtor)
        ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
    console.log('  ✅ saidas_estoque');

    // --- seguranca_produtor ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS seguranca_produtor (
      id_seguranca INT AUTO_INCREMENT PRIMARY KEY,
      produtor_id_produtor INT UNIQUE,
      pergunta_1 VARCHAR(255) NOT NULL,
      resposta_1_hash VARCHAR(255) NOT NULL,
      pergunta_2 VARCHAR(255) NOT NULL,
      resposta_2_hash VARCHAR(255) NOT NULL,
      CONSTRAINT fk_seguranca_produtor FOREIGN KEY (produtor_id_produtor)
        REFERENCES produtor(id_produtor)
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
    console.log('  ✅ seguranca_produtor');

    // --- session (para armazenar JWT) ---
    await conn.query(`
    CREATE TABLE IF NOT EXISTS session (
      id_session INT AUTO_INCREMENT PRIMARY KEY,
      jwt_token TEXT NOT NULL,
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_expiracao DATETIME,
      produtor_id_produtor INT,
      CONSTRAINT fk_session_produtor FOREIGN KEY (produtor_id_produtor)
        REFERENCES produtor(id_produtor)
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
    console.log('  ✅ session');

    await conn.end();
    console.log(`\n🎉 Migration concluída! Banco "${dbName}" pronto.`);
}

migrate().catch((err) => {
    console.error('❌ Erro na migration:', err.message);
    process.exit(1);
});
