const express = require('express');
const PedidoController = require('../controllers/PedidoController');
const autenticacao = require('../middlewares/autenticacao');

/**
 * Rotas de pedidos: /pedidos/...
 * Todas exigem usuário logado (sessão ativa).
 * @param {import('../lib').Database} database
 */
function criarRotasPedidos(database) {
  const router = express.Router();
  const controller = new PedidoController(database);

  router.use(autenticacao);

  router.post('/', controller.inserir);
  router.get('/', controller.buscarDoUsuario);
  router.get('/:id', controller.buscarPorId);
  router.patch('/:id/status', controller.atualizarStatus);
  router.delete('/:id', controller.deletar);

  return router;
}

module.exports = criarRotasPedidos;
