// =====================================================
// 🌱 Seeder — Popula a tabela de produtos com o catálogo
// Uso: npm run seed
// =====================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function seed() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME || 'hortas_db',
        multipleStatements: true,
    });

    console.log('🌱 Inserindo produtos no catálogo...\n');

    // Verifica se já tem produtos
    const [existing] = await conn.query('SELECT COUNT(*) AS total FROM produtos');
    if (existing[0].total > 0) {
        console.log(`⚠️  Tabela "produtos" já contém ${existing[0].total} registros.`);
        console.log('   Para re-popular, limpe a tabela primeiro: TRUNCATE TABLE produtos;');
        await conn.end();
        return;
    }

    // =====================================================
    // HORTALIÇAS, TUBÉRCULOS E VEGETAIS
    // =====================================================
    const hortalicas = [
        ['Abóbora / Moranga', 'Legume de casca dura, polpa nutritiva, usado em sopas e doces.', 'kg'],
        ['Abobrinha', 'Versátil, de casca verde e polpa macia, ideal para refogados e massas.', 'unidade'],
        ['Acelga', 'Folha verde, nutritiva, usada em refogados e sopas.', 'g'],
        ['Agrião', 'Sabor picante, rico em vitaminas, ótimo para saladas e sopas.', 'g'],
        ['Alface', 'Folha base para saladas, muito popular e refrescante.', 'unidade'],
        ['Alho', 'Bulbo aromático, essencial para temperar diversos pratos.', 'g'],
        ['Alho-poró', 'Sabor suave e delicado, ideal para sopas e refogados.', 'unidade'],
        ['Almeirão', 'Folha de sabor amargo, muito apreciada em saladas e refogados.', 'g'],
        ['Almeirão-de-árvore', 'Folha comestível não convencional (PANC), sabor suave.', 'g'],
        ['Amaranto / Caruru', 'Folha comestível (PANC) e grão, rico em nutrientes.', 'g'],
        ['Anredera', 'Tubérculo aéreo (PANC), também conhecida como bertalha-do-reino.', 'g'],
        ['Batata (Inglesa)', 'Tubérculo base da culinária, versátil para diversos preparos.', 'kg'],
        ['Batata-doce', 'Tubérculo de sabor adocicado, rico em energia e fibras.', 'kg'],
        ['Beldroega', 'Planta comestível (PANC), folhas suculentas, usada em saladas e refogados.', 'g'],
        ['Berinjela', 'Legume de cor roxa, versátil em pratos assados e cozidos.', 'unidade'],
        ['Bertalha', 'Trepadeira de folhas suculentas, usada em refogados e cozidos.', 'g'],
        ['Beterraba', 'Raiz de cor roxa vibrante e sabor terroso adocicado.', 'kg'],
        ['Brócolis', 'Rico em nutrientes, de cor verde intensa, muito versátil.', 'unidade'],
        ['Capuchinha', 'Planta comestível (PANC), flores e folhas de sabor picante.', 'g'],
        ['Cará-do-ar', 'Tubérculo aéreo (PANC), cultivado no ar.', 'kg'],
        ['Cebola', 'Bulbo base para muitos pratos, sabor forte e indispensável.', 'kg'],
        ['Cenoura', 'Raiz alaranjada, adocicada e crocante.', 'kg'],
        ['Chuchu', 'Legume neutro, de polpa macia, usado em cozidos e saladas.', 'unidade'],
        ['Couve / Couve-flor', 'Folha verde (couve) ou inflorescência branca (couve-flor), ambas nutritivas.', 'unidade'],
        ['Ervilha', 'Semente usada em diversos pratos, consumida fresca ou seca.', 'kg'],
        ['Espinafre', 'Folha rica em ferro, usada em saladas, refogados e sucos.', 'g'],
        ['Feijão-vagem', 'Vagem verde, consumida cozida em diversos pratos.', 'kg'],
        ['Gengibre', 'Raiz de sabor picante e aromático, usada em chás e temperos.', 'g'],
        ['Inhame / Cará / Taro', 'Tubérculo rico em amido, usado em sopas, purês e cozidos.', 'kg'],
        ['Jambu', 'Folha amazônica (PANC) que provoca sensação de formigamento.', 'g'],
        ['Jiló', 'Fruto verde de sabor amargo, muito apreciado na culinária brasileira.', 'kg'],
        ['Major Gomes', 'Planta comestível (PANC), usada em saladas e refogados.', 'g'],
        ['Mangarito', 'Tubérculo pequeno (PANC), de sabor delicado.', 'kg'],
        ['Mandioquinha-salsa / Batata-baroa', 'Raiz alaranjada, de sabor suave, usada em purês e sopas.', 'kg'],
        ['Maxixe', 'Fruto pequeno, coberto de espinhos macios, usado em cozidos.', 'g'],
        ['Maxixe-do-reino', 'Variedade de maxixe, casca lisa, usado em cozidos.', 'g'],
        ['Milho-verde', 'Grão na espiga, base para diversos pratos doces e salgados.', 'unidade'],
        ['Mostarda', 'Folha de sabor picante, usada em saladas e refogados.', 'g'],
        ['Nabo', 'Raiz branca, usada em conservas, sopas e cozidos.', 'kg'],
        ['Ora-pro-nóbis', 'Planta comestível (PANC), rica em proteína, usada em refogados e caldos.', 'g'],
        ['Peixinho', 'Planta comestível (PANC), folhas empanadas lembram peixe frito.', 'g'],
        ['Pepino', 'Fruto alongado, refrescante, ideal para saladas e conservas.', 'unidade'],
        ['Pimenta / Pimentão', 'Pimentão: Versátil. Pimenta: Fruto de sabor picante, usado para temperar.', 'unidade'],
        ['Quiabo', 'Fruto verde, com textura mucilaginosa, usado em cozidos.', 'g'],
        ['Rabanete', 'Raiz pequena, vermelha, sabor picante, usada em saladas.', 'g'],
        ['Repolho', 'Folhas compactas, usadas em saladas, refogados e conservas.', 'unidade'],
        ['Rúcula', 'Folhas de sabor intenso e levemente picante.', 'g'],
        ['Serralha', 'Planta comestível (PANC), folha de sabor amargo.', 'g'],
        ['Taioba', 'Folha comestível (PANC), usada em refogados, similar à couve.', 'g'],
        ['Tomate', 'Fruto base da culinária, usado em saladas, molhos e refogados.', 'kg'],
        ['Vinagreira', 'Folha e flor comestíveis (PANC), usadas em pratos regionais (ex: Cuxá).', 'g'],
    ];

    // =====================================================
    // FRUTAS E FRUTOS NATIVOS
    // =====================================================
    const frutas = [
        ['Abacate', 'Fruta cremosa e nutritiva, ideal para saladas ou vitaminas.', 'unidade'],
        ['Abacaxi', 'Fruta tropical, ácida e doce, excelente para sucos e consumo in natura.', 'unidade'],
        ['Abiu', 'Fruta amarelada, polpa doce e gelatinosa, nativa do Brasil.', 'unidade'],
        ['Açaí', 'Fruto da palmeira, conhecido por sua polpa energética, base de bowls e vitaminas.', 'g'],
        ['Ameixa', 'Fruta de caroço, polpa doce e suculenta.', 'kg'],
        ['Araçá-boi', 'Fruto ácido, ideal para sucos, sorvetes e doces.', 'kg'],
        ['Araticum', 'Fruto nativo, casca grossa, polpa doce e aromática.', 'unidade'],
        ['Bacaba', 'Fruto de palmeira, polpa oleosa, usado para fazer vinho e azeite.', 'g'],
        ['Bacuri', 'Fruta de casca grossa, polpa branca e ácida, muito aromática.', 'unidade'],
        ['Banana', 'Fruta tropical doce, macia, energética e muito consumida in natura.', 'kg'],
        ['Baru', 'Amêndoa do Baru, semente nutritiva e saborosa do Cerrado.', 'g'],
        ['Buriti', 'Fruto de palmeira, polpa oleosa, usado para doces, sucos e óleos.', 'unidade'],
        ['Cagaita', 'Fruto do Cerrado, suculento, polpa ácida.', 'g'],
        ['Caju', 'Fruta tropical, suculenta, com a castanha na ponta.', 'unidade'],
        ['Cajuzinho-do-cerrado', 'Fruto pequeno e comestível do Cerrado.', 'g'],
        ['Cambuci', 'Fruto da Mata Atlântica, ácido, usado para geleias e sucos.', 'unidade'],
        ['Camu-camu', 'Fruto de alta acidez, rico em vitamina C.', 'g'],
        ['Caqui', 'Fruta doce, de cor alaranjada, consumida madura.', 'unidade'],
        ['Castanha-do-brasil', 'Semente nutritiva e oleaginosa, originária da Amazônia.', 'g'],
        ['Coco Verde', 'Fruto com água doce, ideal para consumo da água e polpa jovem.', 'unidade'],
        ['Coquinho-azedo', 'Fruto pequeno e ácido do Cerrado.', 'g'],
        ['Cupuaçu', 'Fruto amazônico, polpa branca, ácida e aromática.', 'unidade'],
        ['Figo', 'Fruta doce e macia, consumida fresca ou em compotas.', 'kg'],
        ['Fisalis', 'Fruta pequena, amarela, envolta em casca, sabor agridoce.', 'g'],
        ['Gabiroba', 'Fruto pequeno do Cerrado, polpa suculenta, sabor doce-ácido.', 'g'],
        ['Goiaba', 'Fruta doce, polpa rosada ou branca, ideal para sucos e doces.', 'kg'],
        ['Grumixama', 'Fruto pequeno, doce, nativo da Mata Atlântica.', 'g'],
        ['Guaraná', 'Semente usada para bebida energética, nativa da Amazônia.', 'g'],
        ['Inajá', 'Fruto de palmeira, polpa fibrosa e oleosa.', 'unidade'],
        ['Jabuticaba', 'Fruta nativa, casca roxa, polpa branca, consumida in natura ou em geleias.', 'g'],
        ['Jatobá', 'Fruto do Cerrado, casca dura, polpa farinhenta.', 'unidade'],
        ['Jenipapo', 'Fruto de casca grossa, polpa escura, usado em licores e doces.', 'unidade'],
        ['Jerivá', 'Fruto de palmeira, polpa fina e oleosa.', 'unidade'],
        ['Laranja', 'Fruta cítrica, suculenta, ideal para consumo in natura e sucos.', 'kg'],
        ['Limão / Lima', 'Fruta cítrica ácida, essencial para bebidas e temperos.', 'kg'],
        ['Maçã', 'Fruta crocante e doce, muito consumida in natura.', 'kg'],
        ['Mamão', 'Fruta tropical, doce, ideal para o café da manhã.', 'unidade'],
        ['Manga', 'Fruta tropical, polpa suculenta e saborosa.', 'unidade'],
        ['Mangaba', 'Fruto do Cerrado, polpa carnosa e agridoce.', 'g'],
        ['Maracujá', 'Fruta ácida, polpa com sementes, usada em sucos, mousses e doces.', 'kg'],
        ['Melancia', 'Fruta grande, polpa vermelha e muito refrescante.', 'unidade'],
        ['Melão', 'Fruta arredondada, polpa doce e aromática.', 'unidade'],
        ['Morango', 'Fruta vermelha, doce e levemente ácida.', 'g'],
        ['Pequi', 'Fruto do Cerrado, polpa amarela e oleosa, aroma e sabor fortes.', 'unidade'],
        ['Pêssego', 'Fruta de caroço, polpa suculenta e aveludada.', 'kg'],
        ['Pupunha', 'Fruto de palmeira, polpa amarelada, cozido e consumido.', 'unidade'],
        ['Taperebá', 'Fruta azeda, polpa suculenta, usada em sucos e doces.', 'unidade'],
        ['Tucumã', 'Fruto de palmeira, polpa fibrosa, usado em sanduíches e vitaminas.', 'unidade'],
        ['Umbu', 'Fruto do Nordeste, polpa ácida, usado em sucos e sorvetes.', 'g'],
        ['Uva', 'Fruta em cacho, doce, consumida in natura ou em vinhos e sucos.', 'kg'],
        ['Uvaia', 'Fruto amarelado, suculento, sabor doce-ácido.', 'g'],
    ];

    // =====================================================
    // ERVAS E TEMPEROS
    // =====================================================
    const ervas = [
        ['Azedinha', 'Folha pequena de sabor cítrico, usada em saladas e molhos.', 'g'],
        ['Cebolinha', 'Tempero fresco com sabor suave de cebola, muito usado na culinária.', 'g'],
        ['Coentro', 'Aroma marcante, muito usado na culinária regional, especialmente no Nordeste.', 'g'],
        ['Salsa', 'Tempero fresco e aromático, muito usado em finalizações e molhos.', 'g'],
        ['Manjericão', 'Folhas perfumadas, base para molho pesto e pratos italianos.', 'g'],
        ['Hortelã', 'Aroma refrescante, usado em bebidas, sobremesas e pratos árabes.', 'g'],
        ['Alecrim', 'Erva aromática com notas amadeiradas, ideal para carnes assadas e pães.', 'g'],
        ['Tomilho', 'Erva de aroma pungente, excelente para aves, sopas e marinadas.', 'g'],
        ['Louro (Folha)', 'Folhas aromáticas usadas para caldos, feijão e marinadas. Venda por maço/peso.', 'g'],
    ];

    const todosProdutos = [...hortalicas, ...frutas, ...ervas];

    // Insere em batch
    const sql = 'INSERT INTO produtos (nm_produto, descricao, unidade_medida_padrao) VALUES (?, ?, ?)';

    let inseridos = 0;
    for (const produto of todosProdutos) {
        try {
            await conn.execute(sql, produto);
            inseridos++;
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                console.log(`  ⏭️  "${produto[0]}" já existe, pulando...`);
            } else {
                throw err;
            }
        }
    }

    await conn.end();
    console.log(`\n🎉 Seeder concluído! ${inseridos} produtos inseridos.`);
}

seed().catch((err) => {
    console.error('❌ Erro no seeder:', err.message);
    process.exit(1);
});
