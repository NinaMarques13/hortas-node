require('dotenv').config({ path: '.env' });
const pool = require('./src/db.js');

async function testarPedido() {
    console.log('🧪 Iniciando teste de criação de pedido...');

    try {
        // 1. Fazer login como cliente
        console.log('Autenticando cliente...');
        const resLogin = await fetch('http://localhost:3000/api/pedidos/cliente/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'cliente@teste.com', senha: '123456' })
        });
        
        const dataLogin = await resLogin.json();
        if (dataLogin.status !== 'sucesso') {
            throw new Error(`Falha no login: ${dataLogin.mensagem}`);
        }
        const token = dataLogin.token;
        console.log('✅ Cliente autenticado! Token obtido.');

        // 2. Buscar itens do estoque no banco para colocar no pedido
        const [estoques] = await pool.execute(`
            SELECT e.id_estoques, p.nm_produto 
            FROM estoques e 
            JOIN produtos p ON p.id_produto = e.produto_id_produto 
            WHERE e.hortas_id_hortas = 2
        `);
        
        if (estoques.length === 0) {
            throw new Error('Nenhum estoque encontrado para a horta ID 2.');
        }

        // Montar os itens do pedido (comprando 2 unidades de cada, a R$ 5,00 cada)
        const itensPedido = estoques.map(e => ({
            estoque_id: e.id_estoques,
            quantidade: 2,
            preco_unitario: 5.00
        }));

        // 3. Fazer o Pedido via API
        console.log('Enviando pedido via API...');
        const resPedido = await fetch('http://localhost:3000/api/pedidos', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                horta_id: 2,
                endereco_entrega: 'Rua de Teste, 123 - Cliente Teste',
                observacao: 'Deixar na portaria, por favor!',
                itens: itensPedido
            })
        });

        const dataPedido = await resPedido.json();
        if (dataPedido.status === 'sucesso') {
            console.log(`✅ Pedido criado com sucesso! ID do Pedido: ${dataPedido.id_pedido}, Valor Total: R$ ${dataPedido.valor_total}`);
            
            // 4. Verificar se aparece para o entregador
            console.log('Verificando se o pedido aparece para os entregadores...');
            
            // Autenticar entregador
            const resEntregador = await fetch('http://localhost:3000/api/entregador/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'gui@gmail.com', senha: '123456' })
            });
            const dataEnt = await resEntregador.json();
            
            const resProx = await fetch('http://localhost:3000/api/entregador/proxima-entrega', {
                headers: { 'Authorization': `Bearer ${dataEnt.token}` }
            });
            const dataProx = await resProx.json();
            
            if (dataProx.dados && dataProx.dados.id_pedido === dataPedido.id_pedido) {
                console.log('✅ SUCESSO ABSOLUTO! O pedido já está visível para o entregador gui@gmail.com retirar e entregar!');
            } else {
                console.log('⚠️ Pedido foi criado mas não apareceu como "próxima entrega".');
            }
        } else {
            console.error('❌ Erro na criação do pedido:', dataPedido.mensagem);
        }
        
    } catch (err) {
        console.error('❌ Falha geral:', err.message);
    } finally {
        process.exit(0);
    }
}

testarPedido();
