require('dotenv').config({ path: '.env' });
const pool = require('./src/db.js');
const bcrypt = require('bcryptjs');

async function seedHorta() {
    try {
        console.log('🌱 Iniciando criação da Horta e Produtos...');

        // 1. Criar Produtor
        const hash = await bcrypt.hash('123456', 10);
        let idProdutor;
        try {
            const [resProdutor] = await pool.execute(
                'INSERT INTO produtor (nome_produtor, email_produtor, hash_senha, telefone_produtor, nr_cpf) VALUES (?, ?, ?, ?, ?)',
                ['Produtor Master', 'master@horta.com', hash, '41988888888', '12345678901']
            );
            idProdutor = resProdutor.insertId;
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY') {
                const [rows] = await pool.execute('SELECT id_produtor FROM produtor WHERE email_produtor = ?', ['master@horta.com']);
                idProdutor = rows[0].id_produtor;
            } else throw e;
        }

        // 2. Criar Endereço
        const [resEnd] = await pool.execute(
            'INSERT INTO endereco_hortas (nm_rua, nr_cep, nm_bairro, nm_estado, nm_cidade) VALUES (?, ?, ?, ?, ?)',
            ['Rua das Couves, 123', '80000000', 'Centro', 'PR', 'Curitiba']
        );
        const idEndereco = resEnd.insertId;

        // 3. Criar Horta
        const cnpj = Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0');
        const [resHorta] = await pool.execute(
            'INSERT INTO hortas (endereco_hortas_id_endereco_hortas, produtor_id_produtor, nr_cnpj, nome, descricao, visibilidade) VALUES (?, ?, ?, ?, ?, ?)',
            [idEndereco, idProdutor, cnpj, 'Horta da Felicidade', 'Horta orgânica para testes do sistema', 1]
        );
        const idHorta = resHorta.insertId;

        // Atualizar produtor com id_horta
        await pool.execute('UPDATE produtor SET hortas_id_hortas = ? WHERE id_produtor = ?', [idHorta, idProdutor]);

        // 4. Criar Produtos (Alface, Tomate, Cenoura)
        const produtosIniciais = [
            { nome: 'Alface Crespa', und: 'unidade' },
            { nome: 'Tomate Cereja', und: 'kg' },
            { nome: 'Cenoura Orgânica', und: 'kg' }
        ];

        for (const p of produtosIniciais) {
            let idProduto;
            try {
                const [resProd] = await pool.execute(
                    'INSERT INTO produtos (nm_produto, unidade_medida_padrao) VALUES (?, ?)',
                    [p.nome, p.und]
                );
                idProduto = resProd.insertId;
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') {
                    const [rows] = await pool.execute('SELECT id_produto FROM produtos WHERE nm_produto = ?', [p.nome]);
                    idProduto = rows[0].id_produto;
                } else throw e;
            }

            // 5. Adicionar ao Estoque da Horta
            await pool.execute(
                'INSERT INTO estoques (hortas_id_hortas, produto_id_produto, ds_quantidade, dt_validade) VALUES (?, ?, ?, ?)',
                [idHorta, idProduto, 50.00, '2026-12-31']
            );
        }

        console.log('✅ Horta "Horta da Felicidade" e produtos criados com sucesso!');
        console.log(`📌 ID da Horta: ${idHorta}`);
        
    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        process.exit(0);
    }
}

seedHorta();
