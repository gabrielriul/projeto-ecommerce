const { Logger, ValidationError, NotFoundError, DatabaseError } = require('../lib');

/**
 * Middleware central de tratamento de erros da aplicação.
 * Converte as exceções da biblioteca do Projeto 1 em respostas HTTP
 * com mensagens de erro claras para o usuário:
 *   - ValidationError -> 400 (campos obrigatórios / dados inválidos)
 *   - NotFoundError   -> 404 (registro não encontrado)
 *   - DatabaseError   -> 500 (falha no SGBD)
 */
function tratadorDeErros(erro, req, res, next) {
  if (res.headersSent) return next(erro);

  if (erro instanceof ValidationError) {
    return res.status(400).json({ erro: erro.message, campos: erro.campos });
  }
  if (erro instanceof NotFoundError) {
    return res.status(404).json({ erro: erro.message });
  }
  if (erro instanceof DatabaseError) {
    // As exceções da biblioteca já são registradas em log na origem
    return res.status(500).json({ erro: 'Falha interna ao acessar o banco de dados.' });
  }

  // Erros inesperados (fora da biblioteca): registra e responde genérico
  Logger.registrarErro('App', `${req.method} ${req.originalUrl}`, erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = tratadorDeErros;
