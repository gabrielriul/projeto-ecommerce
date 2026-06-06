/**
 * Middleware de autenticação: garante que apenas usuários logados
 * (com sessão ativa) acessem as rotas protegidas.
 */
function autenticacao(req, res, next) {
  if (!req.session || !req.session.usuarioId) {
    return res.status(401).json({
      erro: 'Acesso não autorizado. Faça login para usar o sistema.',
    });
  }
  next();
}

module.exports = autenticacao;
