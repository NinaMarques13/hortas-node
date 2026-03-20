// =====================================================
// 📦 Rota: Cadastro de Estoque
// Equivale ao cadastro_estoque.php
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const validarTokenJwt = require('../middlewares/validadorJwt');

// POST /api/cadastro-estoque
router.post('/', validarTokenJwt, async (req, res) => {
  const dados = req.body;

  // --- Validação dos dados recebidos ---
  // Verifica se os campos obrigatórios foram enviados
  if (
    !dados.hortas_id_hortas ||
    !dados.produto_id_produto ||
    dados.ds_quantiade === undefined || dados.ds_quantiade === null
  ) {
    return res.status(400).json({
      status: 'erro',
      mensagem: 'Campos obrigatórios não preenchidos: id da horta, id do produto e quantidade.',
    });
  }

  // Verifica se o token contém o id_produtor
  const idProdutor = req.usuario?.id_produtor ?? null;

  if (!idProdutor) {
    return res.status(401).json({
      status: 'erro',
      mensagem: 'Token inválido ou não contém o ID do produtor.',
    });
  }

  try {
    // A query insere o 'produto_id_produto' em vez de 'nm_item'.
    // Os campos 'unidade_medida' e 'descricao' pertencem à tabela 'produtos'.
    const sql = `INSERT INTO estoques (hortas_id_hortas, produto_id_produto, ds_quantiade, dt_validade, dt_colheita, dt_plantio)
                 VALUES (?, ?, ?, ?, ?, ?)`;

    const valores = [
      parseInt(dados.hortas_id_hortas, 10),
      parseInt(dados.produto_id_produto, 10),
      dados.ds_quantiade,
      dados.dt_validade || null,
      dados.dt_colheita || null,
      dados.dt_plantio || null,
    ];

    const [resultado] = await pool.execute(sql, valores);

    if (resultado.affectedRows > 0) {
      return res.status(201).json({
        status: 'sucesso',
        mensagem: 'Lote de produto cadastrado no estoque com sucesso!',
      });
    } else {
      return res.status(503).json({
        status: 'erro',
        mensagem: 'Não foi possível cadastrar o lote no estoque.',
      });
    }
  } catch (err) {
    console.error('Erro no banco de dados:', err.message);
    return res.status(500).json({
      status: 'erro',
      mensagem: 'Erro no banco de dados: ' + err.message,
    });
  }
});

module.exports = router;
