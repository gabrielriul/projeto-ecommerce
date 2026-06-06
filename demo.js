/**
 * Demonstração dos casos de uso da biblioteca (temática: e-commerce).
 *
 * Executa o fluxo completo: cadastro de usuários e produtos, buscas,
 * criação de pedidos com baixa de estoque, mudança de status,
 * cancelamento com devolução de estoque e deleções.
 *
 * Também demonstra o tratamento de exceções: os casos de erro proposital
 * (campos obrigatórios ausentes, e-mail duplicado, estoque insuficiente etc.)
 * são capturados e registrados em logs/erros.log.
 *
 * Uso: node demo.js
 * (requer um MongoDB acessível em MONGO_URI ou mongodb://localhost:27017)
 */
const { Database, Usuario, Produto, Pedido } = require('./index');

/** Exibe o resultado de um caso de uso no console. */
function exibir(titulo, dados) {
  console.log(`\n=== ${titulo} ===`);
  if (dados !== undefined) console.dir(dados, { depth: null });
}

/** Executa um caso de erro proposital, capturando e exibindo a exceção. */
async function executarCasoDeErro(titulo, funcao) {
  console.log(`\n=== ${titulo} ===`);
  try {
    await funcao();
    console.log('ATENÇÃO: era esperada uma exceção, mas nenhuma foi lançada!');
  } catch (erro) {
    console.log(`Exceção capturada e registrada no log -> [${erro.name}] ${erro.message}`);
  }
}

async function main() {
  const database = new Database();

  try {
    await database.conectar();
    console.log(`Conectado ao MongoDB (banco: ${database.nomeBanco})`);

    const usuarios = new Usuario(database);
    const produtos = new Produto(database);
    const pedidos = new Pedido(database);

    // Limpa as coleções para uma demonstração reproduzível
    await database.getColecao('usuarios').deleteMany({});
    await database.getColecao('produtos').deleteMany({});
    await database.getColecao('pedidos').deleteMany({});

    // ----------------------------------------------------------------
    // CASOS DE USO - FLUXO PRINCIPAL
    // ----------------------------------------------------------------

    const ana = await usuarios.inserir({
      nome: 'Ana Souza',
      email: 'ana.souza@email.com',
      senha: 'senha123',
      telefone: '(43) 99999-0001',
      endereco: { rua: 'Rua das Flores, 100', cidade: 'Cornélio Procópio', uf: 'PR' },
    });
    exibir('Usuário inserido', { _id: ana._id, nome: ana.nome, email: ana.email });

    const bruno = await usuarios.inserir({
      nome: 'Bruno Lima',
      email: 'bruno.lima@email.com',
      senha: 'senha456',
    });
    exibir('Usuário inserido', { _id: bruno._id, nome: bruno.nome, email: bruno.email });

    const notebook = await produtos.inserir({
      nome: 'Notebook Gamer',
      descricao: 'Notebook com placa de vídeo dedicada',
      preco: 4500.0,
      categoria: 'Informática',
      estoque: 10,
    });
    const mouse = await produtos.inserir({
      nome: 'Mouse sem fio',
      preco: 89.9,
      categoria: 'Informática',
      estoque: 50,
    });
    const cafeteira = await produtos.inserir({
      nome: 'Cafeteira Elétrica',
      preco: 199.9,
      categoria: 'Eletrodomésticos',
      estoque: 5,
    });
    exibir('Produtos inseridos', [notebook.nome, mouse.nome, cafeteira.nome]);

    exibir('Busca de usuário por e-mail', await usuarios.buscarPorEmail('ana.souza@email.com'));
    exibir('Busca de produtos por nome ("note")', await produtos.buscarPorNome('note'));
    exibir('Busca de produtos por categoria ("informática")', await produtos.buscarPorCategoria('Informática'));
    exibir('Busca de produtos por faixa de preço (R$ 50 a R$ 250)', await produtos.buscarPorFaixaDePreco(50, 250));

    const pedidoAna = await pedidos.inserir({
      usuarioId: ana._id,
      itens: [
        { produtoId: notebook._id, quantidade: 1 },
        { produtoId: mouse._id, quantidade: 2 },
      ],
    });
    exibir('Pedido criado (estoque baixado automaticamente)', pedidoAna);

    exibir('Estoque do notebook após o pedido', (await produtos.buscarPorId(notebook._id)).estoque);

    const pedidoAprovado = await pedidos.atualizarStatus(pedidoAna._id, 'aprovado');
    exibir('Pedido aprovado', { _id: pedidoAprovado._id, status: pedidoAprovado.status });

    exibir('Pedidos da usuária Ana', await pedidos.buscarPorUsuario(ana._id));
    exibir('Pedidos com status "aprovado"', (await pedidos.buscarPorStatus('aprovado')).length);

    const pedidoBruno = await pedidos.inserir({
      usuarioId: bruno._id,
      itens: [{ produtoId: cafeteira._id, quantidade: 2 }],
    });
    exibir('Estoque da cafeteira após pedido do Bruno', (await produtos.buscarPorId(cafeteira._id)).estoque);

    await pedidos.atualizarStatus(pedidoBruno._id, 'cancelado');
    exibir('Pedido do Bruno cancelado; estoque devolvido', (await produtos.buscarPorId(cafeteira._id)).estoque);

    // ----------------------------------------------------------------
    // CASOS DE ERRO (exceções capturadas e gravadas em logs/erros.log)
    // ----------------------------------------------------------------

    await executarCasoDeErro('ERRO: usuário sem campos obrigatórios (email, senha)', () =>
      usuarios.inserir({ nome: 'Sem Email' })
    );

    await executarCasoDeErro('ERRO: e-mail com formato inválido', () =>
      usuarios.inserir({ nome: 'Carlos', email: 'email-invalido', senha: 'abc123' })
    );

    await executarCasoDeErro('ERRO: e-mail duplicado (índice único do MongoDB)', () =>
      usuarios.inserir({ nome: 'Ana Clone', email: 'ana.souza@email.com', senha: 'outrasenha' })
    );

    await executarCasoDeErro('ERRO: produto com preço negativo', () =>
      produtos.inserir({ nome: 'Produto Inválido', preco: -10, categoria: 'teste', estoque: 1 })
    );

    await executarCasoDeErro('ERRO: pedido sem itens', () =>
      pedidos.inserir({ usuarioId: ana._id, itens: [] })
    );

    await executarCasoDeErro('ERRO: pedido com estoque insuficiente', () =>
      pedidos.inserir({ usuarioId: ana._id, itens: [{ produtoId: notebook._id, quantidade: 999 }] })
    );

    await executarCasoDeErro('ERRO: pedido para usuário inexistente', () =>
      pedidos.inserir({ usuarioId: '64b000000000000000000000', itens: [{ produtoId: mouse._id, quantidade: 1 }] })
    );

    await executarCasoDeErro('ERRO: busca com id em formato inválido', () =>
      produtos.buscarPorId('id-invalido')
    );

    // ----------------------------------------------------------------
    // DELEÇÕES
    // ----------------------------------------------------------------

    await pedidos.deletar(pedidoBruno._id);
    exibir('Pedido do Bruno deletado', true);

    await produtos.deletar(cafeteira._id);
    exibir('Cafeteira deletada', true);

    await usuarios.deletar(bruno._id);
    exibir('Usuário Bruno deletado', true);

    await executarCasoDeErro('ERRO: deletar usuário já removido', () => usuarios.deletar(bruno._id));

    exibir('Usuários restantes', (await usuarios.buscarTodos()).map((u) => u.nome));
    exibir('Produtos restantes', (await produtos.buscarTodos()).map((p) => `${p.nome} (estoque: ${p.estoque})`));

    console.log('\nDemonstração concluída. Exceções capturadas estão registradas em logs/erros.log');
  } catch (erro) {
    console.error(`\nErro inesperado na demonstração: [${erro.name}] ${erro.message}`);
    process.exitCode = 1;
  } finally {
    await database.desconectar();
    console.log('Conexão com o MongoDB encerrada.');
  }
}

main();
