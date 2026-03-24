// =====================================================
// 🚀 Servidor Express — Backend Hortas Marketplace
// =====================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const path = require('path');
const express = require('express');
const corsMiddleware = require('./middlewares/cors');

// Importação das rotas
const authRoutes = require('./routes/auth.routes');
const hortasRoutes = require('./routes/hortas.routes');
const produtosRoutes = require('./routes/produtos.routes');
const estoquesRoutes = require('./routes/estoques.routes');
const movimentacoesRoutes = require('./routes/movimentacoes.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// Middlewares globais
// =====================================================
app.use(corsMiddleware);
app.use(express.json());

// =====================================================
// Servir arquivos estáticos (front-end)
// =====================================================
app.use(express.static(path.join(__dirname, '..', 'public')));

// =====================================================
// Rotas da API
// =====================================================
app.use('/api/auth', authRoutes);
app.use('/api/hortas', hortasRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/estoques', estoquesRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);

// =====================================================
// Health check
// =====================================================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mensagem: 'API Hortas Marketplace rodando!' });
});

// =====================================================
// Inicia o servidor
// =====================================================
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
