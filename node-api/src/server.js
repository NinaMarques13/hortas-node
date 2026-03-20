// =====================================================
// 🚀 Servidor Express - Backend Hortas (Node.js)
// =====================================================

// Carrega as variáveis de ambiente ANTES de tudo
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const path = require('path');
const express = require('express');
const corsMiddleware = require('./middlewares/cors');
const cadastroEstoqueRoutes = require('./routes/cadastroEstoque');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// Middlewares globais
// =====================================================
app.use(corsMiddleware);
app.use(express.json());

// =====================================================
// Servir arquivos estáticos (front-end de teste)
// =====================================================
app.use(express.static(path.join(__dirname, '..', 'public')));

// =====================================================
// Rotas da API
// =====================================================
app.use('/api/cadastro-estoque', cadastroEstoqueRoutes);

// =====================================================
// Rota de health check
// =====================================================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mensagem: 'API Node.js funcionando!' });
});

// =====================================================
// ⚠️ Rota de teste: Gerar token JWT (REMOVER EM PRODUÇÃO)
// =====================================================
app.get('/api/gerar-token-teste', (_req, res) => {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET_KEY;

  if (!secret) {
    return res.status(500).json({ status: 'erro', mensagem: 'JWT_SECRET_KEY não configurada.' });
  }

  const token = jwt.sign(
    { data: { id_produtor: 1, nome: 'Produtor Teste' } },
    secret,
    { algorithm: 'HS256', expiresIn: '24h' }
  );

  res.json({ status: 'sucesso', token });
});

// =====================================================
// Inicia o servidor
// =====================================================
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
