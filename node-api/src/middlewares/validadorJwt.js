// =====================================================
// 🔐 Middleware de Validação JWT
// Verifica o token Bearer no header Authorization
// =====================================================

const jwt = require('jsonwebtoken');

function validarTokenJwt(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'erro',
            mensagem: 'Token de autenticação não fornecido.',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secret = process.env.JWT_SECRET_KEY;
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

        // Expõe os dados do usuário no req para uso nas rotas
        req.usuario = decoded.data;
        next();
    } catch (err) {
        return res.status(401).json({
            status: 'erro',
            mensagem: 'Token inválido ou expirado.',
        });
    }
}

module.exports = validarTokenJwt;
