/**
 * Erro lançado quando campos obrigatórios não são preenchidos
 * ou quando algum valor não passa nas validações da biblioteca.
 */
class ValidationError extends Error {
  /**
   * @param {string} mensagem - descrição do erro de validação
   * @param {string[]} [campos] - lista de campos que falharam na validação
   */
  constructor(mensagem, campos = []) {
    super(mensagem);
    this.name = 'ValidationError';
    this.campos = campos;
  }
}

module.exports = ValidationError;
