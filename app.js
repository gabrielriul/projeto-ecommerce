const express = require('express');
const session = require('express-session');

const criarRotasAuth = require('./routes/auth');
const criarRotasProdutos = require('./routes/produtos');
const criarRotasPedidos = require('./routes/pedidos');
const tratadorDeErros = require('./middlewares/tratadorDeErros');

/**
 * Cria e configura a aplicação Express (API JSON).
 * Recebe a conexão com o banco por injeção de dependência,
 * o que permite testar a aplicação com um banco simulado.
 *
 * @param {import('./lib').Database} database - conexão com o MongoDB (lib do Projeto 1)
 * @returns {import('express').Express}
 */
function criarApp(database) {
  const app = express();

  // Recebimento de parâmetros POST: JSON e formulários (urlencoded)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Sessões: garantem a autenticidade dos usuários após o login
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'segredo-de-desenvolvimento-ec48b',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 2, // 2 horas
      },
    })
  );

  // Rota raiz: documentação rápida da API
  app.get('/', (req, res) => {
    res.json({
      projeto: 'Projeto 2 - EC48B - Programação Web Back-End (UTFPR-CP)',
      tematica: 'e-commerce',
      autenticado: Boolean(req.session.usuarioId),
      rotas: {
        auth: [
          'POST /auth/cadastro  { nome, email, senha, telefone?, endereco? }',
          'POST /auth/login     { email, senha }',
          'POST /auth/logout',
          'GET  /auth/perfil    (requer login)',
        ],
        produtos: [
          'GET    /produtos?nome=&categoria=&precoMin=&precoMax=',
          'GET    /produtos/:id',
          'POST   /produtos     { nome, preco, categoria, estoque, descricao? } (requer login)',
          'PUT    /produtos/:id (requer login)',
          'DELETE /produtos/:id (requer login)',
        ],
        pedidos: [
          'POST   /pedidos      { itens: [{ produtoId, quantidade }] } (requer login)',
          'GET    /pedidos?status=  (requer login; pedidos do usuário logado)',
          'GET    /pedidos/:id  (requer login)',
          'PATCH  /pedidos/:id/status { status } (requer login)',
          'DELETE /pedidos/:id  (requer login)',
        ],
      },
    });
  });

  // Rotas da aplicação (MVC: rotas -> controllers -> modelos da lib)
  app.use('/auth', criarRotasAuth(database));
  app.use('/produtos', criarRotasProdutos(database));
  app.use('/pedidos', criarRotasPedidos(database));

  // 404 para rotas inexistentes
  app.use((req, res) => {
    res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
  });

  // Tratamento central de erros (mensagens claras + status adequado)
  app.use(tratadorDeErros);

  return app;
}

module.exports = criarApp;
