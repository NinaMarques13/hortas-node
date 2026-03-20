// =====================================================
// ✅ CORS Middleware
// Equivale ao bloco de headers CORS do cors_comum.php
// =====================================================

const cors = require('cors');

const corsMiddleware = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
});

module.exports = corsMiddleware;
