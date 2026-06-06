const crypto = require('crypto');

/**
 * Utilitário de hash de senhas usando somente o módulo nativo crypto
 * (scrypt com salt aleatório). Formato armazenado: "salt:hash".
 */
class Senha {
  /**
   * Gera o hash de uma senha em texto puro.
   * @param {string} senha
   * @returns {string} no formato "salt:hash"
   */
  static gerarHash(senha) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifica se a senha em texto puro corresponde ao hash armazenado.
   * @param {string} senha
   * @param {string} hashArmazenado - no formato "salt:hash"
   * @returns {boolean}
   */
  static verificar(senha, hashArmazenado) {
    if (typeof hashArmazenado !== 'string' || !hashArmazenado.includes(':')) return false;
    const [salt, hashOriginal] = hashArmazenado.split(':');
    const hashTestado = crypto.scryptSync(senha, salt, 64).toString('hex');
    const a = Buffer.from(hashOriginal, 'hex');
    const b = Buffer.from(hashTestado, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

module.exports = Senha;
