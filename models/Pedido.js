const Validator = require('../utils/Validator');
const Logger = require('../utils/Logger');
const DatabaseError = require('../errors/DatabaseError');
const NotFoundError = require('../errors/NotFoundError');
const ValidationError = require('../errors/ValidationError');
const Usuario = require('./Usuario');
const Produto = require('./Produto');

/**
 * Classe que representa a entidade Pedido (compra realizada por um usuário)
 * na coleção "pedidos" do banco de dados.
 *
 * Campos obrigatórios: usuarioId, itens (lista com produtoId e quantidade).
 * Campos calculados: total, status, dataPedido.
 */
class Pedido {
  static get NOME_COLECAO() {
    return 'pedidos';
  }

  static get CAMPOS_OBRIGATORIOS() {
    return ['usuarioId', 'itens'];
  }

  /** Status válidos de um pedido e a ordem natural do fluxo. */
  static get STATUS_VALIDOS() {
    return ['pendente', 'aprovado', 'enviado', 'entregue', 'cancelado'];
  }

  /**
   * @param {import('../config/Database')} database - conexão com o banco
   */
  constructor(database) {
    this.database = database;
    this.usuarios = new Usuario(database);
    this.produtos = new Produto(database);
  }

  /** Atalho para a coleção de pedidos. */
  get colecao() {
    return this.database.getColecao(Pedido.NOME_COLECAO);
  }

  /**
   * Insere um novo pedido no banco de dados.
   * Valida o usuário, os produtos e o estoque; calcula o total com os
   * preços atuais e baixa o estoque dos produtos comprados.
   * @param {{usuarioId: string, itens: {produtoId: string, quantidade: number}[]}} dados
   * @returns {Promise<object>} o documento inserido (com _id)
   */
  async inserir(dados) {
    try {
      Validator.validarCamposObrigatorios(dados, Pedido.CAMPOS_OBRIGATORIOS);
      Validator.validarArrayNaoVazio(dados.itens, 'itens');

      // Verifica se o usuário existe (lança NotFoundError caso contrário)
      const usuario = await this.usuarios.buscarPorId(dados.usuarioId);

      // Valida cada item, verifica estoque e calcula o total do pedido
      const itensDoPedido = [];
      let total = 0;
      for (const item of dados.itens) {
        Validator.validarCamposObrigatorios(item, ['produtoId', 'quantidade']);
        Validator.validarInteiroPositivo(item.quantidade, 'quantidade');

        const produto = await this.produtos.buscarPorId(item.produtoId);
        if (produto.estoque < item.quantidade) {
          throw new ValidationError(
            `Estoque insuficiente para o produto "${produto.nome}": disponível ${produto.estoque}, solicitado ${item.quantidade}.`,
            ['itens']
          );
        }

        itensDoPedido.push({
          produtoId: produto._id,
          nomeProduto: produto.nome,
          precoUnitario: produto.preco,
          quantidade: item.quantidade,
          subtotal: produto.preco * item.quantidade,
        });
        total += produto.preco * item.quantidade;
      }

      // Baixa o estoque de cada produto comprado
      for (const item of itensDoPedido) {
        await this.produtos.atualizarEstoque(item.produtoId, -item.quantidade);
      }

      const documento = {
        usuarioId: usuario._id,
        itens: itensDoPedido,
        total: Number(total.toFixed(2)),
        status: 'pendente',
        dataPedido: new Date(),
      };

      const resultado = await this.colecao.insertOne(documento);
      return { _id: resultado.insertedId, ...documento };
    } catch (erro) {
      Logger.registrarErro('Pedido', 'inserir', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao inserir pedido no banco de dados.', erro);
    }
  }

  /**
   * Busca um pedido pelo seu identificador.
   * @param {string|import('mongodb').ObjectId} id
   * @returns {Promise<object>} o pedido encontrado
   */
  async buscarPorId(id) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      const pedido = await this.colecao.findOne({ _id: objectId });
      if (!pedido) {
        throw new NotFoundError(`Pedido com id "${id}" não encontrado.`);
      }
      return pedido;
    } catch (erro) {
      Logger.registrarErro('Pedido', 'buscarPorId', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao buscar pedido por id.', erro);
    }
  }

  /**
   * Busca todos os pedidos de um usuário.
   * @param {string|import('mongodb').ObjectId} usuarioId
   * @returns {Promise<object[]>} lista de pedidos
   */
  async buscarPorUsuario(usuarioId) {
    try {
      const objectId = Validator.validarObjectId(usuarioId, 'usuarioId');
      return await this.colecao.find({ usuarioId: objectId }).sort({ dataPedido: -1 }).toArray();
    } catch (erro) {
      Logger.registrarErro('Pedido', 'buscarPorUsuario', erro);
      if (erro instanceof ValidationError) throw erro;
      throw new DatabaseError('Falha ao buscar pedidos do usuário.', erro);
    }
  }

  /**
   * Busca pedidos por status.
   * @param {string} status - um dos STATUS_VALIDOS
   * @returns {Promise<object[]>} lista de pedidos
   */
  async buscarPorStatus(status) {
    try {
      Validator.validarCamposObrigatorios({ status }, ['status']);
      if (!Pedido.STATUS_VALIDOS.includes(status)) {
        throw new ValidationError(
          `Status inválido: "${status}". Status válidos: ${Pedido.STATUS_VALIDOS.join(', ')}.`,
          ['status']
        );
      }
      return await this.colecao.find({ status }).sort({ dataPedido: -1 }).toArray();
    } catch (erro) {
      Logger.registrarErro('Pedido', 'buscarPorStatus', erro);
      if (erro instanceof ValidationError) throw erro;
      throw new DatabaseError('Falha ao buscar pedidos por status.', erro);
    }
  }

  /**
   * Lista todos os pedidos cadastrados.
   * @returns {Promise<object[]>}
   */
  async buscarTodos() {
    try {
      return await this.colecao.find({}).sort({ dataPedido: -1 }).toArray();
    } catch (erro) {
      Logger.registrarErro('Pedido', 'buscarTodos', erro);
      throw new DatabaseError('Falha ao listar pedidos.', erro);
    }
  }

  /**
   * Atualiza o status de um pedido (ex.: pendente -> aprovado).
   * Ao cancelar um pedido, o estoque dos produtos é devolvido.
   * @param {string|import('mongodb').ObjectId} id
   * @param {string} novoStatus - um dos STATUS_VALIDOS
   * @returns {Promise<object>} o pedido atualizado
   */
  async atualizarStatus(id, novoStatus) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      Validator.validarCamposObrigatorios({ novoStatus }, ['novoStatus']);
      if (!Pedido.STATUS_VALIDOS.includes(novoStatus)) {
        throw new ValidationError(
          `Status inválido: "${novoStatus}". Status válidos: ${Pedido.STATUS_VALIDOS.join(', ')}.`,
          ['novoStatus']
        );
      }

      const pedido = await this.buscarPorId(objectId);
      if (pedido.status === 'cancelado') {
        throw new ValidationError(`O pedido "${id}" já está cancelado e não pode mudar de status.`);
      }

      // Ao cancelar, devolve o estoque dos produtos do pedido
      if (novoStatus === 'cancelado') {
        for (const item of pedido.itens) {
          await this.produtos.atualizarEstoque(item.produtoId, item.quantidade);
        }
      }

      await this.colecao.updateOne({ _id: objectId }, { $set: { status: novoStatus } });
      return await this.buscarPorId(objectId);
    } catch (erro) {
      Logger.registrarErro('Pedido', 'atualizarStatus', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao atualizar status do pedido.', erro);
    }
  }

  /**
   * Remove um pedido do banco de dados.
   * @param {string|import('mongodb').ObjectId} id
   * @returns {Promise<boolean>} true se o pedido foi removido
   */
  async deletar(id) {
    try {
      const objectId = Validator.validarObjectId(id, '_id');
      const resultado = await this.colecao.deleteOne({ _id: objectId });
      if (resultado.deletedCount === 0) {
        throw new NotFoundError(`Pedido com id "${id}" não encontrado para deleção.`);
      }
      return true;
    } catch (erro) {
      Logger.registrarErro('Pedido', 'deletar', erro);
      if (erro instanceof ValidationError || erro instanceof NotFoundError) throw erro;
      throw new DatabaseError('Falha ao deletar pedido.', erro);
    }
  }
}

module.exports = Pedido;
