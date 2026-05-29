require('dotenv').config({ path: '.env' });
const pool = require('./src/db.js');
const bcrypt = require('bcryptjs');

async function fix() {
    const hash = await bcrypt.hash('123456', 10);
    await pool.execute('UPDATE entregadores SET hash_senha = ? WHERE email = ?', [hash, 'gui@gmail.com']);
    console.log('Senha atualizada com sucesso!');
    process.exit(0);
}
fix();
