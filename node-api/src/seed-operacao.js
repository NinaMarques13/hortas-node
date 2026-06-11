// =====================================================
// 📊 Seeder Operacional — Pedidos (CEP seções 4.3–5.4)
// Gera 150-200 pedidos por horta nos últimos 180 dias,
// com tempos, avarias, rupturas, NPS e TMR simulados.
// Uso: npm run seed:operacao
// =====================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

// ── Helpers ──
function randNormal(mean, sd) {
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(1, Math.round(mean + sd * z));
}

function diasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

function dataIso(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Semana ISO 8601
function semanaDoAno(d) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

async function seedOperacao() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'hortas_db',
  });

  console.log('📊 Seeder Operacional — Gerando pedidos simulados...\n');

  const [hortas] = await conn.query('SELECT id_hortas, nome FROM hortas');
  if (!hortas.length) {
    console.log('⚠️  Nenhuma horta encontrada. Execute "npm run seed:dados" primeiro.');
    await conn.end();
    return;
  }

  console.log(`🌱 ${hortas.length} hortas encontradas.\n`);

  // Semanas marcadas como "lote ruim" (defeito elevado) — global, por número de semana
  const semanasRuins = new Set();

  let totalPedidos = 0;
  let totalFinalizados = 0;
  let totalRupturas = 0;
  let totalAvarias = 0;

  for (const horta of hortas) {
    const numPedidos = 150 + Math.floor(Math.random() * 51); // 150–200

    for (let i = 0; i < numPedidos; i++) {
      const dt = diasAtras(Math.floor(Math.random() * 180));
      const semana = semanaDoAno(dt);

      // Marca ~1 em 12 semanas como lote ruim (determinístico por semana)
      if (semana % 12 === 0) semanasRuins.add(semana);

      const r = Math.random();
      let status;
      let convertido = 0;
      let ruptura = 0;
      let tempoAceite = null, tempoPreparo = null, tempoEntrega = null;
      let qtdItens = null, qtdAvariados = null;
      let npsNota = null, tmr = null;

      if (r < 0.75) {
        // Pedido finalizado
        status = 'finalizado';
        convertido = 1;

        const outlier = Math.random() < 0.03 ? 2 : 1;
        tempoAceite = randNormal(8, 3) * outlier;
        tempoPreparo = randNormal(15, 4) * outlier;
        tempoEntrega = randNormal(38, 7) * outlier;

        // Avarias
        qtdItens = 3 + Math.floor(Math.random() * 8); // 3–10
        const pDefeito = semanasRuins.has(semana) ? 0.12 : 0.03;
        qtdAvariados = 0;
        for (let k = 0; k < qtdItens; k++) {
          if (Math.random() < pDefeito) qtdAvariados++;
        }
        totalAvarias += qtdAvariados;

        // NPS (~60% avaliam)
        if (Math.random() < 0.6) {
          const rn = Math.random();
          if (rn < 0.65) npsNota = 9 + Math.floor(Math.random() * 2);       // 9–10
          else if (rn < 0.85) npsNota = 7 + Math.floor(Math.random() * 2);  // 7–8
          else npsNota = Math.floor(Math.random() * 7);                     // 0–6
        }

        totalFinalizados++;
      } else if (r < 0.80) {
        // Cancelado por ruptura de estoque (~5%)
        status = 'cancelado_ruptura';
        ruptura = 1;
        totalRupturas++;
      } else if (r < 0.85) {
        status = 'cancelado_outro';
      } else {
        status = 'carrinho_abandonado';
      }

      // TMR — ~30% abrem ticket de suporte (qualquer status)
      if (Math.random() < 0.3) tmr = randNormal(8, 4);

      await conn.execute(
        `INSERT INTO pedidos_operacionais
         (hortas_id_hortas, dt_pedido, semana_ano, status, convertido,
          tempo_aceite, tempo_preparo, tempo_entrega, qtd_itens, qtd_avariados,
          ruptura_estoque, nps_nota, tempo_resposta_suporte)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [horta.id_hortas, dataIso(dt), semana, status, convertido,
          tempoAceite, tempoPreparo, tempoEntrega, qtdItens, qtdAvariados,
          ruptura, npsNota, tmr]
      );
      totalPedidos++;
    }

    process.stdout.write(`\r   Horta #${horta.id_hortas} — ${numPedidos} pedidos inseridos`);
  }

  console.log('\n');
  await conn.end();

  console.log('═'.repeat(50));
  console.log('🎉 Seeder Operacional finalizado!');
  console.log(`   Pedidos totais:        ${totalPedidos}`);
  console.log(`   Finalizados:           ${totalFinalizados}`);
  console.log(`   Cancelados (ruptura):  ${totalRupturas}`);
  console.log(`   Itens avariados:       ${totalAvarias}`);
  console.log('');
}

seedOperacao().catch((err) => {
  console.error('❌ Erro no seeder operacional:', err.message);
  process.exit(1);
});
