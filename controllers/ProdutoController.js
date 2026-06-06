const { Produto, ValidationError } = require('../lib');

/**
 * Controller de produtos: casos de uso de armazenamento e busca
 * de produtos da loja (foco da temática e-commerce).
 */
class ProdutoController {
  /**
   * @param {import('../lib').Database} database
   */
  constructor(database) {
    this.produtos = new Produto(database);
  }

  /**
   * GET /produtos — lista/busca produtos.
   * Parâmetros GET (query string): nome, categoria, precoMin, precoMax.
   */
  buscar = async (req, res, next) => {
    try {
      const { nome, categoria, precoMin, precoMax } = req.query;

      let resultado;
      if (precoMin !== undefined || precoMax !== undefined) {
        const minimo = precoMin !== undefined ? Number(precoMin) : 0;
        const maximo = precoMax !== undefined ? Number(precoMax) : Number.MAX_SAFE_INTEGER;
        if (Number.isNaN(minimo) || Number.isNaN(maximo)) {
          throw new ValidationError(
            'Os parâmetros "precoMin" e "precoMax" devem ser números.',
            ['precoMin', 'precoMax']
          );
        }
        resultado = await this.produtos.buscarPorFaixaDePreco(minimo, maximo);
      } else if (nome !== undefined) {
        resultado = await this.produtos.buscarPorNome(nome);
      } else if (categoria !== undefined) {
        resultado = await this.produtos.buscarPorCategoria(categoria);
      } else {
        resultado = await this.produtos.buscarTodos();
      }

      res.json({ total: resultado.length, produtos: resultado });
    } catch (erro) {
      next(erro);
    }
  };

  /** GET /produtos/:id — busca um produto pelo id (parâmetro de rota). */
  buscarPorId = async (req, res, next) => {
    try {
      const produto = await this.produtos.buscarPorId(req.params.id);
      res.json({ produto });
    } catch (erro) {
      next(erro);
    }
  };

  /** POST /produtos — cadastra um produto (requer login). */
  inserir = async (req, res, next) => {
    try {
      const { nome, descricao, preco, categoria, estoque } = req.body;
      const produto = await this.produtos.inserir({
        nome,
        descricao,
        preco: preco !== undefined ? Number(preco) : preco,
        categoria,
        estoque: estoque !== undefined ? Number(estoque) : estoque,
      });
      res.status(201).json({ mensagem: 'Produto cadastrado com sucesso.', produto });
    } catch (erro) {
      next(erro);
    }
  };

  /** PUT /produtos/:id — atualiza um produto (requer login). */
  atualizar = async (req, res, next) => {
    try {
      const dados = { ...req.body };
      if (dados.preco !== undefined) dados.preco = Number(dados.preco);
      if (dados.estoque !== undefined) dados.estoque = Number(dados.estoque);
      const produto = await this.produtos.atualizar(req.params.id, dados);
      res.json({ mensagem: 'Produto atualizado com sucesso.', produto });
    } catch (erro) {
      next(erro);
    }
  };

  /** DELETE /produtos/:id — remove um produto (requer login). */
  deletar = async (req, res, next) => {
    try {
      await this.produtos.deletar(req.params.id);
      res.json({ mensagem: 'Produto removido com sucesso.' });
    } catch (erro) {
      next(erro);
    }
  };
}

module.exports = ProdutoController;
