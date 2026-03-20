// =====================================================
// 📦 Rota: Cadastro de Estoque (In-Memory)
// Armazena em variável para fins de aprendizado
// =====================================================

const express = require('express');
const router = express.Router();
const validarTokenJwt = require('../middlewares/validadorJwt');

// "Banco de dados" em memória
let estoques = [];
let proximoId = 1;

// GET /api/cadastro-estoque — Listar todos os itens
router.get('/', (_req, res) => {
  res.json({
    status: 'sucesso',
    total: estoques.length,
    dados: estoques,
  });
});

// POST /api/cadastro-estoque — Cadastrar novo item
router.post('/', validarTokenJwt, async (req, res) => {
  const dados = req.body;

  // --- Validação dos dados recebidos ---
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

  // Cria o objeto e salva no array
  const novoItem = {
    id: proximoId++,
    hortas_id_hortas: parseInt(dados.hortas_id_hortas, 10),
    produto_id_produto: parseInt(dados.produto_id_produto, 10),
    ds_quantiade: dados.ds_quantiade,
    dt_validade: dados.dt_validade || null,
    dt_colheita: dados.dt_colheita || null,
    dt_plantio: dados.dt_plantio || null,
    id_produtor: idProdutor,
    criado_em: new Date().toISOString(),
  };

  estoques.push(novoItem);

  return res.status(201).json({
    status: 'sucesso',
    mensagem: 'Lote de produto cadastrado no estoque com sucesso!',
    item: novoItem,
  });
});

// DELETE /api/cadastro-estoque/:id — Remover item
router.delete('/:id', validarTokenJwt, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = estoques.findIndex(e => e.id === id);

  if (index === -1) {
    return res.status(404).json({
      status: 'erro',
      mensagem: 'Item não encontrado.',
    });
  }

  estoques.splice(index, 1);
  return res.json({
    status: 'sucesso',
    mensagem: 'Item removido com sucesso!',
  });
});

module.exports = router;
