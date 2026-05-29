require('dotenv').config({ path: '.env' });
const pool = require('./src/db.js');
const bcrypt = require('bcryptjs');

async function createCliente() {
    try {
        const hash = await bcrypt.hash('123456', 10);
        await pool.execute(
            'INSERT INTO clientes (nome, email, hash_senha, telefone, endereco_entrega) VALUES (?, ?, ?, ?, ?)',
            ['Cliente de Teste', 'cliente@teste.com', hash, '41999999999', 'Rua de Teste, 123']
        );
        console.log('Cliente cadastrado com sucesso!');
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.log('Cliente já existe. Atualizando senha...');
            const hash = await bcrypt.hash('123456', 10);
            await pool.execute('UPDATE clientes SET hash_senha = ? WHERE email = ?', [hash, 'cliente@teste.com']);
            console.log('Senha atualizada com sucesso!');
        } else {
            console.error('Erro:', err);
        }
    } finally {
        process.exit(0);
    }
}
createCliente();
