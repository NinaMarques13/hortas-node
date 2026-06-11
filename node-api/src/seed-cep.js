// =====================================================
// 📊 Seeder CEP — Histórico de Movimentações
// Gera 40-60 entradas/saídas por lote de estoque,
// distribuídas nos últimos 180 dias.
// Uso: npm run seed:cep
// =====================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

// Quantidade base por produto (em kg). Variação de ±30% para criar dispersão estatística.
// Produtos com unidade_medida_padrao = 'unidade' usam quantidades inteiras menores.
const BASE_QTY_KG = 15;
const BASE_QTY_UND = 10;

function qtdAleatoria(base, variacao = 0.3) {
  const fator = 1 - variacao + Math.random() * variacao * 2;
  return parseFloat((base * fator).toFixed(2));
}

function diasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

function dataIso(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function seedCep() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'hortas_db',
  });

  console.log('📊 Seeder CEP — Gerando histórico de movimentações...\n');

  // Buscar todos os estoques com produtor e unidade do produto
  const [estoques] = await conn.query(
    `SELECT es.id_estoques, es.hortas_id_hortas, pr.unidade_medida_padrao,
            h.produtor_id_produtor
     FROM estoques es
     JOIN produtos pr ON pr.id_produto = es.produto_id_produto
     JOIN hortas h ON h.id_hortas = es.hortas_id_hortas`
  );

  if (!estoques.length) {
    console.log('⚠️  Nenhum estoque encontrado. Execute "npm run seed:dados" primeiro.');
    await conn.end();
    return;
  }

  console.log(`📦 ${estoques.length} lotes de estoque encontrados.\n`);

  let totalEntradas = 0;
  let totalSaidas = 0;

  for (const estoque of estoques) {
    const isUnidade = estoque.unidade_medida_padrao === 'unidade';
    const base = isUnidade ? BASE_QTY_UND : BASE_QTY_KG;
    const idEstoque = estoque.id_estoques;
    const idProdutor = estoque.produtor_id_produtor;

    const numMovimentos = 40 + Math.floor(Math.random() * 21); // 40–60 por lote

    for (let i = 0; i < numMovimentos; i++) {
      // Data aleatória nos últimos 180 dias
      const diasAleatorios = Math.floor(Math.random() * 180);
      const dt = diasAtras(diasAleatorios);
      const dtFormatada = dataIso(dt);

      const qtd = qtdAleatoria(base);
      const isEntrada = Math.random() < 0.55; // 55% entradas, 45% saídas

      if (isEntrada) {
        await conn.execute(
          `INSERT INTO entradas_estoque (estoques_id_estoques, produtor_id_produtor, dt_entrada, quantidade, motivo)
           VALUES (?, ?, ?, ?, ?)`,
          [idEstoque, idProdutor, dtFormatada, qtd, 'colheita']
        );
        totalEntradas++;
      } else {
        await conn.execute(
          `INSERT INTO saidas_estoque (estoques_id_estoques, produtor_id_produtor, dt_saida, quantidade, motivo)
           VALUES (?, ?, ?, ?, ?)`,
          [idEstoque, idProdutor, dtFormatada, qtd, 'venda']
        );
        totalSaidas++;
      }
    }

    process.stdout.write(`\r   Lote #${idEstoque} — ${numMovimentos} movimentos inseridos`);
  }

  console.log('\n');
  await conn.end();

  console.log('═'.repeat(50));
  console.log(`🎉 Seeder CEP finalizado!`);
  console.log(`   Entradas inseridas: ${totalEntradas}`);
  console.log(`   Saídas inseridas:   ${totalSaidas}`);
  console.log(`   Total:              ${totalEntradas + totalSaidas}`);
  console.log('');
}

seedCep().catch((err) => {
  console.error('❌ Erro no seeder CEP:', err.message);
  process.exit(1);
});
