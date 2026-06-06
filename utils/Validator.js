const { ObjectId } = require('mongodb');
const ValidationError = require('../errors/ValidationError');

/**
 * Classe utilitária com as rotinas de verificação de preenchimento
 * de campos obrigatórios e demais validações de dados da biblioteca.
 * Todos os métodos lançam ValidationError quando a validação falha.
 */
class Validator {
  /**
   * Verifica se todos os campos obrigatórios foram preenchidos.
   * Um campo é considerado não preenchido quando é undefined, null
   * ou uma string vazia/somente espaços.
   * @param {object} dados - objeto com os dados a validar
   * @param {string[]} camposObrigatorios - nomes dos campos obrigatórios
   */
  static validarCamposObrigatorios(dados, camposObrigatorios) {
    if (!dados || typeof dados !== 'object') {
      throw new ValidationError('Dados não informados ou em formato inválido.', camposObrigatorios);
    }

    const ausentes = camposObrigatorios.filter((campo) => {
      const valor = dados[campo];
      if (valor === undefined || valor === null) return true;
      if (typeof valor === 'string' && valor.trim() === '') return true;
      return false;
    });

    if (ausentes.length > 0) {
      throw new ValidationError(
        `Campos obrigatórios ausentes ou vazios: ${ausentes.join(', ')}.`,
        ausentes
      );
    }
  }

  /**
   * Valida o formato de um endereço de e-mail.
   * @param {string} email
   */
  static validarEmail(email) {
    const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !formatoEmail.test(email)) {
      throw new ValidationError(`E-mail inválido: "${email}".`, ['email']);
    }
  }

  /**
   * Valida se o valor é um número maior que zero.
   * @param {*} valor
   * @param {string} nomeCampo - nome do campo (para a mensagem de erro)
   */
  static validarNumeroPositivo(valor, nomeCampo) {
    if (typeof valor !== 'number' || Number.isNaN(valor) || valor <= 0) {
      throw new ValidationError(
        `O campo "${nomeCampo}" deve ser um número maior que zero. Valor recebido: ${valor}.`,
        [nomeCampo]
      );
    }
  }

  /**
   * Valida se o valor é um número maior ou igual a zero.
   * @param {*} valor
   * @param {string} nomeCampo - nome do campo (para a mensagem de erro)
   */
  static validarNumeroNaoNegativo(valor, nomeCampo) {
    if (typeof valor !== 'number' || Number.isNaN(valor) || valor < 0) {
      throw new ValidationError(
        `O campo "${nomeCampo}" deve ser um número maior ou igual a zero. Valor recebido: ${valor}.`,
        [nomeCampo]
      );
    }
  }

  /**
   * Valida se o valor é um número inteiro maior que zero.
   * @param {*} valor
   * @param {string} nomeCampo - nome do campo (para a mensagem de erro)
   */
  static validarInteiroPositivo(valor, nomeCampo) {
    if (!Number.isInteger(valor) || valor <= 0) {
      throw new ValidationError(
        `O campo "${nomeCampo}" deve ser um número inteiro maior que zero. Valor recebido: ${valor}.`,
        [nomeCampo]
      );
    }
  }

  /**
   * Valida se o valor é um array não vazio.
   * @param {*} valor
   * @param {string} nomeCampo - nome do campo (para a mensagem de erro)
   */
  static validarArrayNaoVazio(valor, nomeCampo) {
    if (!Array.isArray(valor) || valor.length === 0) {
      throw new ValidationError(
        `O campo "${nomeCampo}" deve ser uma lista com pelo menos um item.`,
        [nomeCampo]
      );
    }
  }

  /**
   * Valida se o valor é um ObjectId válido do MongoDB e o converte.
   * @param {*} id
   * @param {string} nomeCampo - nome do campo (para a mensagem de erro)
   * @returns {ObjectId} o id convertido para ObjectId
   */
  static validarObjectId(id, nomeCampo = '_id') {
    if (id instanceof ObjectId) return id;
    if (!ObjectId.isValid(id)) {
      throw new ValidationError(
        `O campo "${nomeCampo}" não é um identificador (ObjectId) válido: ${id}.`,
        [nomeCampo]
      );
    }
    return new ObjectId(id);
  }
}

module.exports = Validator;
