/**
 * Erro lançado quando ocorre uma falha na comunicação com o SGBD
 * (conexão, inserção, busca, deleção etc.). Encapsula o erro original
 * lançado pelo driver do MongoDB.
 */
class DatabaseError extends Error {
  /**
   * @param {string} mensagem - descrição amigável do erro
   * @param {Error} [erroOriginal] - exceção original lançada pelo driver
   */
  constructor(mensagem, erroOriginal = null) {
    super(mensagem);
    this.name = 'DatabaseError';
    this.erroOriginal = erroOriginal;
  }
}

module.exports = DatabaseError;
