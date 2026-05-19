// =====================================================
// 🗄️ Migration — Entregador, Pedidos e Itens
// Uso: node src/migrate_entregador.js
// Rode DEPOIS do migrate.js principal
// =====================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        multipleStatements: true,
    });

    const dbName = process.env.DB_NAME || 'hortas_db';
    await conn.query(`USE \`${dbName}\``);

    console.log('📦 Criando tabelas de entregador e pedidos...\n');

    // --- entregadores ---
    await conn.query(`
        CREATE TABLE IF NOT EXISTS entregadores (
            id_entregador INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            hash_senha VARCHAR(255) NOT NULL,
            telefone VARCHAR(15),
            nr_cpf VARCHAR(11) UNIQUE,
            ativo TINYINT(1) DEFAULT 1,
            dt_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ entregadores');

    // --- clientes ---
    await conn.query(`
        CREATE TABLE IF NOT EXISTS clientes (
            id_cliente INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            hash_senha VARCHAR(255) NOT NULL,
            telefone VARCHAR(15),
            endereco_entrega VARCHAR(255),
            dt_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ clientes');

    // --- pedidos ---
    await conn.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id_pedido INT AUTO_INCREMENT PRIMARY KEY,
            cliente_id INT NOT NULL,
            entregador_id INT DEFAULT NULL,
            horta_id INT NOT NULL,
            status ENUM('pendente','aceito','a_caminho','entregue','cancelado') DEFAULT 'pendente',
            endereco_entrega VARCHAR(255) NOT NULL,
            observacao VARCHAR(255) DEFAULT NULL,
            valor_total DECIMAL(10,2) DEFAULT 0.00,
            dt_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
            dt_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id)
                REFERENCES clientes(id_cliente)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_pedido_entregador FOREIGN KEY (entregador_id)
                REFERENCES entregadores(id_entregador)
                ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT fk_pedido_horta FOREIGN KEY (horta_id)
                REFERENCES hortas(id_hortas)
                ON DELETE CASCADE ON UPDATE CASCADE
        )
    `);
    console.log('  ✅ pedidos');

    // --- itens_pedido ---
    await conn.query(`
        CREATE TABLE IF NOT EXISTS itens_pedido (
            id_item INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            estoque_id INT NOT NULL,
            quantidade DECIMAL(10,2) NOT NULL,
            preco_unitario DECIMAL(10,2) NOT NULL,
            CONSTRAINT fk_item_pedido FOREIGN KEY (pedido_id)
                REFERENCES pedidos(id_pedido)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_item_estoque FOREIGN KEY (estoque_id)
                REFERENCES estoques(id_estoques)
                ON DELETE CASCADE ON UPDATE CASCADE
        )
    `);
    console.log('  ✅ itens_pedido');

    await conn.end();
    console.log('\n🎉 Migration de entregador concluída!');
}

migrate().catch((err) => {
    console.error('❌ Erro na migration:', err.message);
    process.exit(1);
});
