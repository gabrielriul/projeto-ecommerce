const Validator = require('../utils/Validator');
const Logger = require('../utils/Logger');
const DatabaseError = require('../errors/DatabaseError');
const NotFoundError = require('../errors/NotFoundError');
const ValidationError = require('../errors/ValidationError');

/**
 * Classe que representa a entidade Produto (item à venda na loja)
 * na coleção "produtos" do banco de dados.
 *
 * Campos obrigatórios: nome, preco, categoria, estoque.
 * Campos opcionais: descricao.
 */
class Produto {
  static get NOME_COLECAO() {
    return 'produtos';
  }

  static get CAMPOS_OBRIGATORIOS() {
    return ['nome', 'preco', 'categoria', 'estoque'];
  }

  /**
   * @param {import('../config/Database')} database - conexão com o banco
   */
  constructor(database) {
    this.database = database;
  }

  /** Atalho para a coleção de produtos. */
  get colecao() {
    return this.database.getColecao(Produto.NOME_COLECAO);
  }

  /**
   * Insere um novo produto no banco de dados.
   * @param {{nome: string, preco: number, categoria: string, estoque: number, descricao?: string}} dados
   * @returns {Promise<object>} o documento inserido (com _id)
   */
  async inserir(dados) {
    try {
      Validator.validarCamposObrigatorios(dados, Produto.CAMPOS_OBRIGATORIOS);
      Validator.validarNumeroPositivo(dados.preco, 'preco');
      Validator.validarNumeroNaoNegativo(dados.estoque, 'estoque');

      const documento = {
        nome: dados.nome.trim(),
        descricao: dados.descricao || null,
        preco: dados.preco,
        categoria: dados.categoria.trim().toLowerCase(),
        estoque: dados.estoque,
        dataCadastro: new Date(),
      };

      const resultado = await this.colecao.insertOne(documento);
      return { _id: resultado.insertedId, ...documento };
    } catch (erro) {
      Logger.registrarErro('Produto', 'inserir', erro);
      if (erro instanceof ValidationError) throw erro;
      throw new DatabaseError('Falha ao inserir produto no banco de dados.', erro);
    }
  }

  /**
   * Busca um produto pelo seu identificador.
   * @param {string|import('mongodb').ObjectId} id
   * @returns {Promise<object>} o produto encontrado
   */
  async buscarPorId(id) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      const produto = await this.colecao.findOne({ _id: objectId });
      if (!produto) {
        throw new NotFoundError(`Produto com id "${id}" não encontrado.`);
      }
      return produto;
    } catch (erro) {
      Logger.registrarErro('Produto', 'buscarPorId', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao buscar produto por id.', erro);
    }
  }

  /**
   * Busca produtos pelo nome (busca parcial, sem diferenciar maiúsculas).
   * @param {string} nome
   * @returns {Promise<object[]>} lista de produtos
   */
  async buscarPorNome(nome) {
    try {
      Validator.validarCamposObrigatorios({ nome }, ['nome']);
      return await this.colecao.find({ nome: { $regex: nome, $options: 'i' } }).toArray();
    } catch (erro) {
      Logger.registrarErro('Produto', 'buscarPorNome', erro);
      if (erro instanceof ValidationError) throw erro;
      throw new DatabaseError('Falha ao buscar produtos por nome.', erro);
    }
  }

  /**
   * Busca produtos por categoria.
   * @param {string} categoria
   * @returns {Promise<object[]>} lista de produtos
   */
  async buscarPorCategoria(categoria) {
    try {
      Validator.validarCamposObrigatorios({ categoria }, ['categoria']);
      return await this.colecao.find({ categoria: categoria.trim().toLowerCase() }).toArray();
    } catch (erro) {
      Logger.registrarErro('Produto', 'buscarPorCategoria', erro);
      if (erro instanceof ValidationError) throw erro;
      throw new DatabaseError('Falha ao buscar produtos por categoria.', erro);
    }
  }

  /**
   * Busca produtos dentro de uma faixa de preço (inclusive).
   * @param {number} precoMinimo
   * @param {number} precoMaximo
   * @returns {Promise<object[]>} lista de produtos
   */
  async buscarPorFaixaDePreco(precoMinimo, precoMaximo) {
    try {
      Validator.validarNumeroNaoNegativo(precoMinimo, 'precoMinimo');
      Validator.validarNumeroPositivo(precoMaximo, 'precoMaximo');
      if (precoMinimo > precoMaximo) {
        throw new ValidationError(
          `O preço mínimo (${precoMinimo}) não pode ser maior que o preço máximo (${precoMaximo}).`,
          ['precoMinimo', 'precoMaximo']
        );
      }
      return await this.colecao
        .find({ preco: { $gte: precoMinimo, $lte: precoMaximo } })
        .sort({ preco: 1 })
        .toArray();
    } catch (erro) {
      Logger.registrarErro('Produto', 'buscarPorFaixaDePreco', erro);
      if (erro instanceof ValidationError) throw erro;
      throw new DatabaseError('Falha ao buscar produtos por faixa de preço.', erro);
    }
  }

  /**
   * Lista todos os produtos cadastrados.
   * @returns {Promise<object[]>}
   */
  async buscarTodos() {
    try {
      return await this.colecao.find({}).toArray();
    } catch (erro) {
      Logger.registrarErro('Produto', 'buscarTodos', erro);
      throw new DatabaseError('Falha ao listar produtos.', erro);
    }
  }

  /**
   * Atualiza os dados de um produto.
   * @param {string|import('mongodb').ObjectId} id
   * @param {object} dados - campos a atualizar
   * @returns {Promise<object>} o produto atualizado
   */
  async atualizar(id, dados) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      if (!dados || typeof dados !== 'object' || Object.keys(dados).length === 0) {
        throw new ValidationError('Nenhum dado informado para atualização.');
      }
      if (dados.preco !== undefined) Validator.validarNumeroPositivo(dados.preco, 'preco');
      if (dados.estoque !== undefined) Validator.validarNumeroNaoNegativo(dados.estoque, 'estoque');

      const resultado = await this.colecao.updateOne({ _id: objectId }, { $set: dados });
      if (resultado.matchedCount === 0) {
        throw new NotFoundError(`Produto com id "${id}" não encontrado para atualização.`);
      }
      return await this.buscarPorId(objectId);
    } catch (erro) {
      Logger.registrarErro('Produto', 'atualizar', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao atualizar produto.', erro);
    }
  }

  /**
   * Soma (ou subtrai, com valor negativo) unidades ao estoque do produto.
   * Não permite que o estoque fique negativo.
   * @param {string|import('mongodb').ObjectId} id
   * @param {number} quantidade - positiva para entrada, negativa para saída
   * @returns {Promise<object>} o produto atualizado
   */
  async atualizarEstoque(id, quantidade) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      if (!Number.isInteger(quantidade)) {
        throw new ValidationError(
          `O campo "quantidade" deve ser um número inteiro. Valor recebido: ${quantidade}.`,
          ['quantidade']
        );
      }

      const produto = await this.buscarPorId(objectId);
      const novoEstoque = produto.estoque + quantidade;
      if (novoEstoque < 0) {
        throw new ValidationError(
          `Estoque insuficiente para o produto "${produto.nome}": estoque atual ${produto.estoque}, solicitado ${Math.abs(quantidade)}.`,
          ['estoque']
        );
      }

      await this.colecao.updateOne({ _id: objectId }, { $set: { estoque: novoEstoque } });
      return await this.buscarPorId(objectId);
    } catch (erro) {
      Logger.registrarErro('Produto', 'atualizarEstoque', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao atualizar estoque do produto.', erro);
    }
  }

  /**
   * Remove um produto do banco de dados.
   * @param {string|import('mongodb').ObjectId} id
   * @returns {Promise<boolean>} true se o produto foi removido
   */
  async deletar(id) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      const resultado = await this.colecao.deleteOne({ _id: objectId });
      if (resultado.deletedCount === 0) {
        throw new NotFoundError(`Produto com id "${id}" não encontrado para deleção.`);
      }
      return true;
    } catch (erro) {
      Logger.registrarErro('Produto', 'deletar', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao deletar produto.', erro);
    }
  }
}

module.exports = Produto;
