// =====================================================
// 🚀 Servidor Express - Backend Hortas (Node.js)
// =====================================================

// Carrega as variáveis de ambiente ANTES de tudo
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

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
// Rotas
// =====================================================
app.use('/api/cadastro-estoque', cadastroEstoqueRoutes);

// =====================================================
// Rota de health check
// =====================================================
app.get('/', (_req, res) => {
  res.json({ status: 'ok', mensagem: 'API Node.js funcionando!' });
});

// =====================================================
// Inicia o servidor
// =====================================================
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
