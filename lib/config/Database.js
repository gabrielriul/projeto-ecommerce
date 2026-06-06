const { MongoClient } = require('mongodb');
const Logger = require('../utils/Logger');
const DatabaseError = require('../errors/DatabaseError');

/**
 * Classe responsável pela conexão com o SGBD (MongoDB),
 * utilizando o driver oficial do MongoDB para Node.js.
 */
class Database {
  /**
   * @param {string} [uri] - string de conexão do MongoDB
   * @param {string} [nomeBanco] - nome do banco de dados
   */
  constructor(
    uri = process.env.MONGO_URI || 'mongodb://localhost:27017',
    nomeBanco = process.env.MONGO_DB || 'ecommerce'
  ) {
    this.uri = uri;
    this.nomeBanco = nomeBanco;
    this.cliente = null;
    this.db = null;
  }

  /**
   * Abre a conexão com o MongoDB e cria os índices necessários.
   * @returns {Promise<import('mongodb').Db>} instância do banco de dados
   */
  async conectar() {
    try {
      this.cliente = new MongoClient(this.uri);
      await this.cliente.connect();
      this.db = this.cliente.db(this.nomeBanco);
      await this.criarIndices();
      return this.db;
    } catch (erro) {
      Logger.registrarErro('Database', 'conectar', erro);
      throw new DatabaseError(`Falha ao conectar ao MongoDB em "${this.uri}".`, erro);
    }
  }

  /**
   * Cria os índices das coleções (e-mail único na coleção de usuários).
   */
  async criarIndices() {
    try {
      await this.db.collection('usuarios').createIndex({ email: 1 }, { unique: true });
    } catch (erro) {
      Logger.registrarErro('Database', 'criarIndices', erro);
      throw new DatabaseError('Falha ao criar índices no banco de dados.', erro);
    }
  }

  /**
   * Retorna uma coleção do banco de dados.
   * @param {string} nome - nome da coleção
   * @returns {import('mongodb').Collection}
   */
  getColecao(nome) {
    if (!this.db) {
      const erro = new DatabaseError(
        'Banco de dados não conectado. Chame o método conectar() antes de usar a coleção.'
      );
      Logger.registrarErro('Database', 'getColecao', erro);
      throw erro;
    }
    return this.db.collection(nome);
  }

  /**
   * Encerra a conexão com o MongoDB.
   */
  async desconectar() {
    try {
      if (this.cliente) {
        await this.cliente.close();
        this.cliente = null;
        this.db = null;
      }
    } catch (erro) {
      Logger.registrarErro('Database', 'desconectar', erro);
      throw new DatabaseError('Falha ao desconectar do MongoDB.', erro);
    }
  }
}

module.exports = Database;
