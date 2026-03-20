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
// Inicia o servidor
// =====================================================
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
