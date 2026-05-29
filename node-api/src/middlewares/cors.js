// =====================================================
// 🌐 Middleware de CORS
// Permite requisições de origens configuradas
// =====================================================

const cors = require('cors');

const origensPermitidas = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const corsMiddleware = cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (ex: Postman, curl)
        if (!origin) return callback(null, true);

        if (origensPermitidas.includes(origin) || origensPermitidas.includes('*')) {
            return callback(null, true);
        }

        callback(new Error(`CORS bloqueado para a origem: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
});

module.exports = corsMiddleware;
