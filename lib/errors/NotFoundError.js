/**
 * Erro lançado quando um registro não é encontrado no banco de dados.
 */
class NotFoundError extends Error {
  /**
   * @param {string} mensagem - descrição do erro
   */
  constructor(mensagem) {
    super(mensagem);
    this.name = 'NotFoundError';
  }
}

module.exports = NotFoundError;
