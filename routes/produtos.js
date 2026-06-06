const express = require('express');
const ProdutoController = require('../controllers/ProdutoController');
const autenticacao = require('../middlewares/autenticacao');

/**
 * Rotas de produtos: /produtos/...
 * Buscas são públicas; cadastro/atualização/remoção exigem login.
 * @param {import('../lib').Database} database
 */
function criarRotasProdutos(database) {
  const router = express.Router();
  const controller = new ProdutoController(database);

  router.get('/', controller.buscar);
  router.get('/:id', controller.buscarPorId);
  router.post('/', autenticacao, controller.inserir);
  router.put('/:id', autenticacao, controller.atualizar);
  router.delete('/:id', autenticacao, controller.deletar);

  return router;
}

module.exports = criarRotasProdutos;
