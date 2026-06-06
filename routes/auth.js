const express = require('express');
const AuthController = require('../controllers/AuthController');
const autenticacao = require('../middlewares/autenticacao');

/**
 * Rotas de autenticação: /auth/...
 * @param {import('../lib').Database} database
 */
function criarRotasAuth(database) {
  const router = express.Router();
  const controller = new AuthController(database);

  router.post('/cadastro', controller.cadastro);
  router.post('/login', controller.login);
  router.post('/logout', controller.logout);
  router.get('/perfil', autenticacao, controller.perfil);

  return router;
}

module.exports = criarRotasAuth;
