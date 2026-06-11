// =====================================================
// 🌱 Seeder Completo — Cria produtores, hortas e estoques
// Uso: npm run seed:dados
// =====================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ── Dados dos produtores ──
const produtores = [
  {
    nome: 'Maria Silva',
    cpf: '11122233344',
    email: 'maria@hortas.com',
    telefone: '11999991111',
    senha: '123456',
    pergunta1: 'Qual o nome do seu primeiro pet?',
    resposta1: 'rex',
    pergunta2: 'Qual a sua cidade natal?',
    resposta2: 'são paulo',
    horta: {
      nome: 'Horta da Maria',
      descricao: 'Horta urbana orgânica com foco em hortaliças e temperos frescos.',
      cnpj: '11222333000101',
      rua: 'Rua das Flores, 123',
      bairro: 'Jardim Botânico',
      cep: '01234567',
      cidade: 'São Paulo',
      estado: 'SP',
      pais: 'Brasil',
    },
  },
  {
    nome: 'João Oliveira',
    cpf: '22233344455',
    email: 'joao@hortas.com',
    telefone: '21999992222',
    senha: '123456',
    pergunta1: 'Qual o nome da sua mãe?',
    resposta1: 'ana',
    pergunta2: 'Qual sua comida favorita?',
    resposta2: 'arroz e feijão',
    horta: {
      nome: 'Horta do João',
      descricao: 'Produção de frutas nativas e ervas medicinais no coração do Rio.',
      cnpj: '22333444000102',
      rua: 'Av. Atlântica, 456',
      bairro: 'Copacabana',
      cep: '22070001',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      pais: 'Brasil',
    },
  },
  {
    nome: 'Ana Souza',
    cpf: '33344455566',
    email: 'ana@hortas.com',
    telefone: '31999993333',
    senha: '123456',
    pergunta1: 'Qual sua cor favorita?',
    resposta1: 'verde',
    pergunta2: 'Qual o nome da sua escola?',
    resposta2: 'escola verde vida',
    horta: {
      nome: 'Horta Verde Vida',
      descricao: 'Horta comunitária com variedade de vegetais, PANCs e temperos.',
      cnpj: '33444555000103',
      rua: 'Rua Minas Gerais, 789',
      bairro: 'Savassi',
      cep: '30130001',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      pais: 'Brasil',
    },
  },
  {
    nome: 'Carlos Santos',
    cpf: '44455566677',
    email: 'carlos@hortas.com',
    telefone: '41999994444',
    senha: '123456',
    pergunta1: 'Qual o nome do seu melhor amigo?',
    resposta1: 'pedro',
    pergunta2: 'Qual seu esporte favorito?',
    resposta2: 'futebol',
    horta: {
      nome: 'Horta do Sul',
      descricao: 'Especializada em tubérculos, raízes e hortaliças de inverno.',
      cnpj: '44555666000104',
      rua: 'Rua XV de Novembro, 321',
      bairro: 'Centro',
      cep: '80020310',
      cidade: 'Curitiba',
      estado: 'PR',
      pais: 'Brasil',
    },
  },
  {
    nome: 'Fernanda Lima',
    cpf: '55566677788',
    email: 'fernanda@hortas.com',
    telefone: '71999995555',
    senha: '123456',
    pergunta1: 'Qual o nome do seu avô?',
    resposta1: 'josé',
    pergunta2: 'Qual sua fruta favorita?',
    resposta2: 'manga',
    horta: {
      nome: 'Horta Tropical',
      descricao: 'Frutas tropicais e ervas aromáticas cultivadas com muito carinho.',
      cnpj: '55666777000105',
      rua: 'Rua do Pelourinho, 55',
      bairro: 'Pelourinho',
      cep: '40026280',
      cidade: 'Salvador',
      estado: 'BA',
      pais: 'Brasil',
    },
  },
];

async function seedDados() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'hortas_db',
    multipleStatements: true,
  });

  console.log('🌱 Seeder Completo — Criando produtores, hortas e estoques...\n');

  // Buscar todos os produtos do catálogo
  const [produtos] = await conn.query('SELECT id_produto, nm_produto FROM produtos ORDER BY id_produto');
  if (produtos.length === 0) {
    console.log('⚠️  Nenhum produto no catálogo. Execute "npm run seed" primeiro.');
    await conn.end();
    return;
  }
  console.log(`📦 ${produtos.length} produtos encontrados no catálogo.\n`);

  for (const prod of produtores) {
    try {
      console.log(`👤 Criando produtor: ${prod.nome}...`);

      // 1. Inserir produtor
      const hashSenha = await bcrypt.hash(prod.senha, 10);
      const [resProd] = await conn.execute(
        `INSERT INTO produtor (nome_produtor, nr_cpf, email_produtor, hash_senha, telefone_produtor)
         VALUES (?, ?, ?, ?, ?)`,
        [prod.nome, prod.cpf, prod.email, hashSenha, prod.telefone]
      );
      const idProdutor = resProd.insertId;
      console.log(`   ✅ Produtor #${idProdutor} criado`);

      // 2. Inserir perguntas de segurança
      const r1Hash = await bcrypt.hash(prod.resposta1.toLowerCase(), 10);
      const r2Hash = await bcrypt.hash(prod.resposta2.toLowerCase(), 10);
      await conn.execute(
        `INSERT INTO seguranca_produtor (produtor_id_produtor, pergunta_1, resposta_1_hash, pergunta_2, resposta_2_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [idProdutor, prod.pergunta1, r1Hash, prod.pergunta2, r2Hash]
      );
      console.log(`   ✅ Perguntas de segurança criadas`);

      // 3. Inserir endereço da horta
      const h = prod.horta;
      const [resEnd] = await conn.execute(
        `INSERT INTO endereco_hortas (nm_rua, nr_cep, nm_bairro, nm_estado, nm_cidade, nm_pais)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [h.rua, h.cep, h.bairro, h.estado, h.cidade, h.pais]
      );
      const idEndereco = resEnd.insertId;

      // 4. Inserir horta
      const [resHorta] = await conn.execute(
        `INSERT INTO hortas (endereco_hortas_id_endereco_hortas, produtor_id_produtor, nr_cnpj, nome, descricao, visibilidade, receitas_geradas)
         VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [idEndereco, idProdutor, h.cnpj, h.nome, h.descricao]
      );
      const idHorta = resHorta.insertId;
      console.log(`   🌱 Horta "${h.nome}" #${idHorta} criada`);

      // 5. Sortear 8-15 produtos aleatórios para o estoque desta horta
      const shuffled = [...produtos].sort(() => Math.random() - 0.5);
      const qtdProdutos = 8 + Math.floor(Math.random() * 8); // 8 a 15
      const produtosHorta = shuffled.slice(0, qtdProdutos);

      let estoquesInseridos = 0;
      for (const p of produtosHorta) {
        const quantidade = (Math.random() * 200 + 5).toFixed(2); // 5 a 205
        const hoje = new Date();

        // Datas realistas
        const dtPlantio = new Date(hoje);
        dtPlantio.setDate(dtPlantio.getDate() - Math.floor(Math.random() * 90 + 30)); // 30-120 dias atrás

        const dtColheita = new Date(dtPlantio);
        dtColheita.setDate(dtColheita.getDate() + Math.floor(Math.random() * 60 + 30)); // 30-90 dias após plantio

        const dtValidade = new Date(dtColheita);
        dtValidade.setDate(dtValidade.getDate() + Math.floor(Math.random() * 30 + 7)); // 7-37 dias após colheita

        const fmt = (d) => d.toISOString().split('T')[0];

        await conn.execute(
          `INSERT INTO estoques (hortas_id_hortas, produto_id_produto, ds_quantidade, dt_validade, dt_colheita, dt_plantio)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [idHorta, p.id_produto, quantidade, fmt(dtValidade), fmt(dtColheita), fmt(dtPlantio)]
        );
        estoquesInseridos++;
      }
      console.log(`   📦 ${estoquesInseridos} lotes de estoque criados`);
      console.log('');

    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log(`   ⏭️  "${prod.nome}" já existe, pulando...\n`);
        continue;
      }
      throw err;
    }
  }

  await conn.end();

  console.log('═'.repeat(50));
  console.log('🎉 Seeder completo finalizado!');
  console.log('');
  console.log('📋 Credenciais de login (todos com senha: 123456):');
  for (const p of produtores) {
    console.log(`   • ${p.nome} → ${p.email}`);
  }
  console.log('');
}

seedDados().catch((err) => {
  console.error('❌ Erro no seeder:', err.message);
  process.exit(1);
});
