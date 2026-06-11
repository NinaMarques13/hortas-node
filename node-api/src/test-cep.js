// =====================================================
// 🧪 Suite de Testes — CEP Hortas Marketplace
// Bloco 1: testes unitários de utils/estatistica.js
// Bloco 2: testes de integração dos endpoints /api/cep/*
// Uso: npm run test:cep
// =====================================================

'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const http  = require('http');
const https = require('https');
const assert = require('assert');

const BASE_URL = process.argv.find(a => a.startsWith('--base-url='))
  ?.split('=')[1] ?? 'http://localhost:4000';

// ── carrega módulo de estatística ──────────────────
const {
  calcularMedia,
  calcularAmplitude,
  calcularDesvioPadrao,
  calcularCV,
  gerarTabelaFrequencias,
  interpretarHistograma,
  calcularLimitesControle,
  avaliarPontosControle,
  calcularCartaXR,
  calcularCartaP,
  calcularCartaC,
} = require('./utils/estatistica');

// ── helpers de teste ──────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function ok(label, value) {
  if (value) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}`);
    failed++;
    failures.push(label);
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(55));
}

async function fetchJson(path) {
  const url = BASE_URL + '/api' + path;
  const mod = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    mod.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: body });
        }
      });
    }).on('error', reject);
  });
}

// =====================================================
// BLOCO 1 — Testes unitários de utils/estatistica.js
// =====================================================
function testarEstatistica() {
  section('BLOCO 1 — utils/estatistica.js');

  // calcularMedia
  console.log('\n  [calcularMedia]');
  ok('Array vazio retorna 0',         calcularMedia([]) === 0);
  ok('Um único elemento',              calcularMedia([7]) === 7);
  ok('Média de [2,4,6,8] = 5',         calcularMedia([2,4,6,8]) === 5);
  ok('Média de floats',                Math.abs(calcularMedia([1.5, 2.5]) - 2) < 0.001);

  // calcularAmplitude
  console.log('\n  [calcularAmplitude]');
  ok('Array vazio retorna 0',          calcularAmplitude([]) === 0);
  ok('Amplitude de valores iguais = 0',calcularAmplitude([5,5,5]) === 0);
  ok('Amplitude de [3,10,1,7] = 9',    calcularAmplitude([3,10,1,7]) === 9);

  // calcularDesvioPadrao
  console.log('\n  [calcularDesvioPadrao]');
  ok('Array vazio retorna 0',          calcularDesvioPadrao([]) === 0);
  ok('Um elemento retorna 0',          calcularDesvioPadrao([5]) === 0);
  const dp = calcularDesvioPadrao([2,4,4,4,5,5,7,9]);
  ok('Desvio-padrão amostral do exemplo clássico ≈ 2',
     Math.abs(dp - 2.138) < 0.01);

  // calcularCV
  console.log('\n  [calcularCV]');
  ok('CV com média 0 retorna 0',       calcularCV(5, 0) === 0);
  ok('CV = (2/10)*100 = 20%',          Math.abs(calcularCV(2, 10) - 20) < 0.001);

  // gerarTabelaFrequencias
  console.log('\n  [gerarTabelaFrequencias]');
  ok('Array vazio retorna []',         gerarTabelaFrequencias([]).length === 0);
  ok('1 elemento retorna [] (n < 2)',  gerarTabelaFrequencias([5]).length === 0);
  const dados20 = Array.from({length:20}, (_,i) => i + 1);
  const tabela  = gerarTabelaFrequencias(dados20);
  ok('20 valores geram tabela não-vazia', tabela.length > 0);
  const somaContagens = tabela.reduce((s,c) => s + c.contagem, 0);
  ok('Soma das contagens = n',         somaContagens === 20);
  const somaFreq = tabela.reduce((s,c) => s + c.frequencia_relativa, 0);
  ok('Soma das frequências relativas ≈ 1', Math.abs(somaFreq - 1) < 0.001);
  const tabIguais = gerarTabelaFrequencias([3,3,3,3]);
  ok('Todos iguais: 1 classe com amplitude=0', tabIguais.length === 1 && tabIguais[0].amplitude === 0);

  // interpretarHistograma
  console.log('\n  [interpretarHistograma]');
  ok('Tabela vazia',                   typeof interpretarHistograma([]) === 'string');
  ok('Retorna string não-vazia',       interpretarHistograma(tabela).length > 0);

  // calcularLimitesControle
  console.log('\n  [calcularLimitesControle]');
  const lim = calcularLimitesControle(10, 2);
  ok('LC = média',                     lim.lc === 10);
  ok('LSC = média + 3*dp',             lim.lsc === 16);
  ok('LIC = média - 3*dp',             lim.lic === 4);

  // avaliarPontosControle
  console.log('\n  [avaliarPontosControle]');
  const pts = avaliarPontosControle([5, 17, 3], { lsc: 16, lc: 10, lic: 4 });
  ok('Retorna um ponto por valor',     pts.length === 3);
  ok('Valor 5 dentro dos limites [4,16]',  !pts[0].fora_controle);
  ok('Valor 17 acima do LSC=16',       pts[1].fora_controle);
  ok('Valor 3 abaixo do LIC=4',        pts[2].fora_controle);

  // calcularCartaXR
  console.log('\n  [calcularCartaXR]');
  ok('null retorna null',              calcularCartaXR(null) === null);
  ok('Array vazio retorna null',       calcularCartaXR([]) === null);
  ok('Subgrupo com 1 elemento retorna null', calcularCartaXR([[5]]) === null);
  const xrDados = [[3,5,4],[7,6,8],[2,4,3]];
  const xr = calcularCartaXR(xrDados);
  ok('Subgrupos válidos retornam objeto não-null', xr !== null);
  ok('xBarBar é número',               typeof xr?.xBarBar === 'number');
  ok('rBar é número',                  typeof xr?.rBar === 'number');
  ok('xbar.pontos é array',            Array.isArray(xr?.xbar?.pontos));
  ok('r.pontos é array',               Array.isArray(xr?.r?.pontos));
  ok('xbar tem 3 pontos (1 por subgrupo)', xr?.xbar?.pontos?.length === 3);

  // calcularCartaP
  console.log('\n  [calcularCartaP]');
  ok('null retorna null',              calcularCartaP(null) === null);
  ok('Array vazio retorna null',       calcularCartaP([]) === null);
  ok('Sem inspecionados retorna null', calcularCartaP([{inspecionados:0, defeituosos:0}]) === null);
  const pDados = [{inspecionados:50,defeituosos:5},{inspecionados:50,defeituosos:3},{inspecionados:50,defeituosos:7}];
  const carta_p = calcularCartaP(pDados);
  ok('Dados válidos retornam objeto',  carta_p !== null);
  ok('pBar é número',                  typeof carta_p?.pBar === 'number');
  ok('pBar está entre 0 e 1',         carta_p?.pBar >= 0 && carta_p?.pBar <= 1);
  ok('3 subgrupos → 3 pontos',         carta_p?.pontos?.length === 3);
  ok('Limites respeitam LIC ≤ LC ≤ LSC',
    carta_p?.lic <= carta_p?.lc && carta_p?.lc <= carta_p?.lsc);

  // calcularCartaC
  console.log('\n  [calcularCartaC]');
  ok('null retorna null',              calcularCartaC(null) === null);
  ok('Array vazio retorna null',       calcularCartaC([]) === null);
  const cDados = [{semana:1,contagem:2},{semana:2,contagem:5},{semana:3,contagem:3},{semana:4,contagem:4}];
  const carta_c = calcularCartaC(cDados);
  ok('Dados válidos retornam objeto',  carta_c !== null);
  ok('cBar = média das contagens = 3.5', Math.abs(carta_c?.cBar - 3.5) < 0.001);
  ok('LSC > LC',                       carta_c?.lsc > carta_c?.lc);
  ok('LIC ≥ 0 (carta C não admite negativo)', carta_c?.lic >= 0);
  ok('4 semanas → 4 pontos',           carta_c?.pontos?.length === 4);
}

// =====================================================
// BLOCO 2 — Testes de integração dos endpoints
// =====================================================
async function testarEndpoints() {
  section('BLOCO 2 — Endpoints /api/cep/*');

  // Health
  console.log('\n  [GET /api/health]');
  let r;
  try {
    r = await fetchJson('/health');
    ok('Servidor acessível',  r !== null);
    ok('Status HTTP 200',     r.status === 200);
  } catch {
    ok('Servidor acessível',  false);
    ok('Status HTTP 200',     false);
    console.log('\n  ⚠️  Servidor inacessível — pulando testes de integração.');
    return;
  }

  // CEP estoque — id inválido
  console.log('\n  [GET /api/cep/estoque/0 — ID inválido]');
  r = await fetchJson('/cep/estoque/0');
  ok('Retorna 400 para id=0',  r.status === 400);
  ok('Body tem status: "erro"', r.body?.status === 'erro');

  // CEP estoque — id inexistente
  console.log('\n  [GET /api/cep/estoque/999999 — ID inexistente]');
  r = await fetchJson('/cep/estoque/999999');
  ok('Retorna 200 mesmo sem dados', r.status === 200);
  ok('Status "sucesso"',            r.body?.status === 'sucesso');
  ok('n = 0 (sem movimentações)',   r.body?.n === 0);

  // CEP estoque — lote real
  console.log('\n  [GET /api/cep/estoque/1]');
  r = await fetchJson('/cep/estoque/1');
  ok('Status HTTP 200',         r.status === 200);
  ok('Body status = "sucesso"', r.body?.status === 'sucesso');
  if (r.body?.n === 0) {
    console.log('  ℹ️  Estoque 1 sem movimentações — execute "npm run seed:cep"');
  }

  // CEP estoque com período
  console.log('\n  [GET /api/cep/estoque/1?periodo=30]');
  r = await fetchJson('/cep/estoque/1?periodo=30');
  ok('Status 200 com periodo=30',  r.status === 200);
  ok('periodo_dias = 30 na resposta', r.body?.periodo_dias === 30);

  // CEP horta — id inválido
  console.log('\n  [GET /api/cep/horta/0 — ID inválido]');
  r = await fetchJson('/cep/horta/0');
  ok('Retorna 400 para id_horta=0', r.status === 400);

  // CEP horta — real
  console.log('\n  [GET /api/cep/horta/1]');
  r = await fetchJson('/cep/horta/1');
  ok('Status HTTP 200',         r.status === 200);
  ok('Body status = "sucesso"', r.body?.status === 'sucesso');
  if (r.body?.n === 0) {
    console.log('  ℹ️  Horta 1 sem movimentações — execute "npm run seed:cep"');
  }

  // CEP horta com filtro produto
  console.log('\n  [GET /api/cep/horta/1?produto_id=1]');
  r = await fetchJson('/cep/horta/1?produto_id=1');
  ok('Status 200 com filtro produto_id', r.status === 200);
  ok('produto_filtrado está na resposta', 'produto_filtrado' in (r.body || {}));

  // CEP horta inexistente
  console.log('\n  [GET /api/cep/horta/999999 — Horta inexistente]');
  r = await fetchJson('/cep/horta/999999');
  ok('Retorna 200 mesmo sem dados', r.status === 200);
  ok('n = 0 para horta sem estoques', r.body?.n === 0);

  // CEP operação
  console.log('\n  [GET /api/cep/operacao]');
  r = await fetchJson('/cep/operacao');
  ok('Status HTTP 200',         r.status === 200);
  ok('Body status = "sucesso"', r.body?.status === 'sucesso');
  ok('kpis é objeto',           typeof r.body?.kpis === 'object');
  if (r.body?.kpis) {
    ok('taxa_conversao presente',   typeof r.body.kpis.taxa_conversao === 'number');
    ok('taxa_ruptura presente',     typeof r.body.kpis.taxa_ruptura === 'number');
    ok('taxa_avaria presente',      typeof r.body.kpis.taxa_avaria === 'number');
    ok('nps presente',              typeof r.body.kpis.nps === 'number');
    ok('cartas é objeto',           typeof r.body?.cartas === 'object');
  }
}

// =====================================================
// Runner principal
// =====================================================
(async () => {
  console.log('\n🧪 Testes CEP — Hortas Marketplace');
  console.log(`📡 Base URL: ${BASE_URL}`);

  testarEstatistica();
  await testarEndpoints();

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  RESULTADO FINAL`);
  console.log('═'.repeat(55));
  console.log(`  ✅ Passou: ${passed}`);
  console.log(`  ❌ Falhou: ${failed}`);
  if (failures.length) {
    console.log('\n  Falhas:');
    failures.forEach(f => console.log(`    • ${f}`));
  }
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
})();
