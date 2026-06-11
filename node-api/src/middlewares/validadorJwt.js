// =====================================================
// 🔐 Middleware de Validação JWT
// Equivale ao validador_jwt.php
// =====================================================

const jwt = require('jsonwebtoken');

function validarTokenJwt(req, res, next) {
  const jwtSecretKey = process.env.JWT_SECRET_KEY;

  if (!jwtSecretKey) {
    return res.status(500).json({
      status: 'erro',
      mensagem: 'A chave secreta JWT (JWT_SECRET_KEY) não foi configurada no servidor.',
    });
  }

  // Pega o header Authorization
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      status: 'erro',
      mensagem: 'Token de autenticação não fornecido.',
    });
  }

  // O token vem no formato "Bearer [token]"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      status: 'erro',
      mensagem: 'Formato de token inválido.',
    });
  }

  const token = parts[1];

  try {
    // Decodifica o token. Se for inválido, uma exceção será lançada.
    const decoded = jwt.verify(token, jwtSecretKey, { algorithms: ['HS256'] });

    // Disponibiliza os dados do usuário (payload.data) na requisição
    req.usuario = decoded.data || decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'erro',
      mensagem: 'Acesso não autorizado: ' + err.message,
    });
  }
}

module.exports = validarTokenJwt;
