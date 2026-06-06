const Validator = require('../utils/Validator');
const Logger = require('../utils/Logger');
const DatabaseError = require('../errors/DatabaseError');
const NotFoundError = require('../errors/NotFoundError');
const ValidationError = require('../errors/ValidationError');

/**
 * Classe que representa a entidade Usuário (cliente da loja)
 * na coleção "usuarios" do banco de dados.
 *
 * Campos obrigatórios: nome, email, senha.
 * Campos opcionais: telefone, endereco.
 */
class Usuario {
  static get NOME_COLECAO() {
    return 'usuarios';
  }

  static get CAMPOS_OBRIGATORIOS() {
    return ['nome', 'email', 'senha'];
  }

  /**
   * @param {import('../config/Database')} database - conexão com o banco
   */
  constructor(database) {
    this.database = database;
  }

  /** Atalho para a coleção de usuários. */
  get colecao() {
    return this.database.getColecao(Usuario.NOME_COLECAO);
  }

  /**
   * Insere um novo usuário no banco de dados.
   * @param {{nome: string, email: string, senha: string, telefone?: string, endereco?: object}} dados
   * @returns {Promise<object>} o documento inserido (com _id)
   */
  async inserir(dados) {
    try {
      Validator.validarCamposObrigatorios(dados, Usuario.CAMPOS_OBRIGATORIOS);
      Validator.validarEmail(dados.email);

      const documento = {
        nome: dados.nome.trim(),
        email: dados.email.trim().toLowerCase(),
        senha: dados.senha,
        telefone: dados.telefone || null,
        endereco: dados.endereco || null,
        dataCadastro: new Date(),
      };

      const resultado = await this.colecao.insertOne(documento);
      return { _id: resultado.insertedId, ...documento };
    } catch (erro) {
      Logger.registrarErro('Usuario', 'inserir', erro);

      // Código 11000 = violação de índice único (e-mail duplicado)
      if (erro && erro.code === 11000) {
        throw new ValidationError(`Já existe um usuário cadastrado com o e-mail "${dados.email}".`, ['email']);
      }
      if (erro instanceof ValidationError) throw erro;
      throw new DatabaseError('Falha ao inserir usuário no banco de dados.', erro);
    }
  }

  /**
   * Busca um usuário pelo seu identificador.
   * @param {string|import('mongodb').ObjectId} id
   * @returns {Promise<object>} o usuário encontrado
   */
  async buscarPorId(id) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      const usuario = await this.colecao.findOne({ _id: objectId });
      if (!usuario) {
        throw new NotFoundError(`Usuário com id "${id}" não encontrado.`);
      }
      return usuario;
    } catch (erro) {
      Logger.registrarErro('Usuario', 'buscarPorId', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao buscar usuário por id.', erro);
    }
  }

  /**
   * Busca um usuário pelo e-mail.
   * @param {string} email
   * @returns {Promise<object>} o usuário encontrado
   */
  async buscarPorEmail(email) {
    try {
      Validator.validarCamposObrigatorios({ email }, ['email']);
      const usuario = await this.colecao.findOne({ email: email.trim().toLowerCase() });
      if (!usuario) {
        throw new NotFoundError(`Usuário com e-mail "${email}" não encontrado.`);
      }
      return usuario;
    } catch (erro) {
      Logger.registrarErro('Usuario', 'buscarPorEmail', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao buscar usuário por e-mail.', erro);
    }
  }

  /**
   * Busca usuários pelo nome (busca parcial, sem diferenciar maiúsculas).
   * @param {string} nome
   * @returns {Promise<object[]>} lista de usuários
   */
  async buscarPorNome(nome) {
    try {
      Validator.validarCamposObrigatorios({ nome }, ['nome']);
      return await this.colecao.find({ nome: { $regex: nome, $options: 'i' } }).toArray();
    } catch (erro) {
      Logger.registrarErro('Usuario', 'buscarPorNome', erro);
      if (erro instanceof ValidationError) throw erro;
      throw new DatabaseError('Falha ao buscar usuários por nome.', erro);
    }
  }

  /**
   * Lista todos os usuários cadastrados.
   * @returns {Promise<object[]>}
   */
  async buscarTodos() {
    try {
      return await this.colecao.find({}).toArray();
    } catch (erro) {
      Logger.registrarErro('Usuario', 'buscarTodos', erro);
      throw new DatabaseError('Falha ao listar usuários.', erro);
    }
  }

  /**
   * Atualiza os dados de um usuário.
   * @param {string|import('mongodb').ObjectId} id
   * @param {object} dados - campos a atualizar
   * @returns {Promise<object>} o usuário atualizado
   */
  async atualizar(id, dados) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      if (!dados || typeof dados !== 'object' || Object.keys(dados).length === 0) {
        throw new ValidationError('Nenhum dado informado para atualização.');
      }
      if (dados.email !== undefined) {
        Validator.validarEmail(dados.email);
        dados.email = dados.email.trim().toLowerCase();
      }

      const resultado = await this.colecao.updateOne({ _id: objectId }, { $set: dados });
      if (resultado.matchedCount === 0) {
        throw new NotFoundError(`Usuário com id "${id}" não encontrado para atualização.`);
      }
      return await this.buscarPorId(objectId);
    } catch (erro) {
      Logger.registrarErro('Usuario', 'atualizar', erro);
      if (erro && erro.code === 11000) {
        throw new ValidationError(`Já existe um usuário cadastrado com o e-mail "${dados.email}".`, ['email']);
      }
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao atualizar usuário.', erro);
    }
  }

  /**
   * Remove um usuário do banco de dados.
   * @param {string|import('mongodb').ObjectId} id
   * @returns {Promise<boolean>} true se o usuário foi removido
   */
  async deletar(id) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      const resultado = await this.colecao.deleteOne({ _id: objectId });
      if (resultado.deletedCount === 0) {
        throw new NotFoundError(`Usuário com id "${id}" não encontrado para deleção.`);
      }
      return true;
    } catch (erro) {
      Logger.registrarErro('Usuario', 'deletar', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao deletar usuário.', erro);
    }
  }
}

module.exports = Usuario;
