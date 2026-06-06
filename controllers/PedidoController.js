const { Pedido, ValidationError } = require('../lib');

/**
 * Controller de pedidos: realização de compras pelo usuário logado,
 * acompanhamento e mudança de status (regras de negócio da lib do P1:
 * validação de estoque, cálculo do total e devolução de estoque no
 * cancelamento).
 */
class PedidoController {
  /**
   * @param {import('../lib').Database} database
   */
  constructor(database) {
    this.pedidos = new Pedido(database);
  }

  /**
   * POST /pedidos — cria um pedido para o usuário LOGADO (o id vem da
   * sessão, nunca do corpo da requisição).
   */
  inserir = async (req, res, next) => {
    try {
      const pedido = await this.pedidos.inserir({
        usuarioId: req.session.usuarioId,
        itens: req.body.itens,
      });
      res.status(201).json({ mensagem: 'Pedido realizado com sucesso.', pedido });
    } catch (erro) {
      next(erro);
    }
  };

  /** GET /pedidos?status= — lista os pedidos do usuário logado. */
  buscarDoUsuario = async (req, res, next) => {
    try {
      let pedidos = await this.pedidos.buscarPorUsuario(req.session.usuarioId);
      const { status } = req.query;
      if (status !== undefined) {
        if (!Pedido.STATUS_VALIDOS.includes(status)) {
          throw new ValidationError(
            `Status inválido: "${status}". Status válidos: ${Pedido.STATUS_VALIDOS.join(', ')}.`,
            ['status']
          );
        }
        pedidos = pedidos.filter((p) => p.status === status);
      }
      res.json({ total: pedidos.length, pedidos });
    } catch (erro) {
      next(erro);
    }
  };

  /** GET /pedidos/:id — detalha um pedido do usuário logado. */
  buscarPorId = async (req, res, next) => {
    try {
      const pedido = await this.pedidos.buscarPorId(req.params.id);
      if (String(pedido.usuarioId) !== req.session.usuarioId) {
        return res.status(403).json({ erro: 'Este pedido pertence a outro usuário.' });
      }
      res.json({ pedido });
    } catch (erro) {
      next(erro);
    }
  };

  /** PATCH /pedidos/:id/status — atualiza o status de um pedido do usuário. */
  atualizarStatus = async (req, res, next) => {
    try {
      const pedidoExistente = await this.pedidos.buscarPorId(req.params.id);
      if (String(pedidoExistente.usuarioId) !== req.session.usuarioId) {
        return res.status(403).json({ erro: 'Este pedido pertence a outro usuário.' });
      }
      const pedido = await this.pedidos.atualizarStatus(req.params.id, req.body.status);
      res.json({ mensagem: `Status do pedido atualizado para "${pedido.status}".`, pedido });
    } catch (erro) {
      next(erro);
    }
  };

  /** DELETE /pedidos/:id — remove um pedido do usuário logado. */
  deletar = async (req, res, next) => {
    try {
      const pedidoExistente = await this.pedidos.buscarPorId(req.params.id);
      if (String(pedidoExistente.usuarioId) !== req.session.usuarioId) {
        return res.status(403).json({ erro: 'Este pedido pertence a outro usuário.' });
      }
      await this.pedidos.deletar(req.params.id);
      res.json({ mensagem: 'Pedido removido com sucesso.' });
    } catch (erro) {
      next(erro);
    }
  };
}

module.exports = PedidoController;
