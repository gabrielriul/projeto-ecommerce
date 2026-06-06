/**
 * Testes da API (node:test, sem bibliotecas externas).
 * Sobe a aplicação Express com um banco simulado em memória e
 * exercita os casos de uso da temática e os critérios de avaliação:
 * validação de campos obrigatórios com mensagens de erro, login com
 * sessões e regras de negócio do e-commerce.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const criarApp = require('../app');
const MockDatabase = require('./MockDatabase');

let servidor;
let base;

/** Pequeno cliente HTTP com suporte a cookie de sessão. */
function criarCliente() {
  let cookie = null;
  return async function requisitar(metodo, caminho, corpo) {
    const res = await fetch(base + caminho, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (setCookie.length > 0) cookie = setCookie[0].split(';')[0];
    const texto = await res.text();
    return { status: res.status, corpo: texto ? JSON.parse(texto) : null };
  };
}

before(async () => {
  const app = criarApp(new MockDatabase());
  await new Promise((resolver) => {
    servidor = app.listen(0, () => resolver());
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor.close());

// ---------------------------------------------------------------
// Autenticação e sessões
// ---------------------------------------------------------------

test('GET / responde com a documentação da API', async () => {
  const cliente = criarCliente();
  const r = await cliente('GET', '/');
  assert.equal(r.status, 200);
  assert.ok(r.corpo.rotas);
});

test('cadastro: sucesso retorna 201 sem expor a senha', async () => {
  const cliente = criarCliente();
  const r = await cliente('POST', '/auth/cadastro', {
    nome: 'Ana Souza', email: 'ana@email.com', senha: 'segredo123',
  });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.usuario.email, 'ana@email.com');
  assert.equal(r.corpo.usuario.senha, undefined);
});

test('cadastro: campos obrigatórios ausentes retornam 400 com mensagem e campos', async () => {
  const cliente = criarCliente();
  const r = await cliente('POST', '/auth/cadastro', { nome: 'Sem Email' });
  assert.equal(r.status, 400);
  assert.match(r.corpo.erro, /senha/i);

  const r2 = await cliente('POST', '/auth/cadastro', { senha: 'x', nome: '' });
  assert.equal(r2.status, 400);
  assert.match(r2.corpo.erro, /obrigat/i);
  assert.ok(Array.isArray(r2.corpo.campos) && r2.corpo.campos.length > 0);
});

test('cadastro: e-mail duplicado retorna 400 com mensagem clara', async () => {
  const cliente = criarCliente();
  await cliente('POST', '/auth/cadastro', { nome: 'A', email: 'dup@email.com', senha: '1' });
  const r = await cliente('POST', '/auth/cadastro', { nome: 'B', email: 'dup@email.com', senha: '2' });
  assert.equal(r.status, 400);
  assert.match(r.corpo.erro, /já existe/i);
});

test('login: credenciais corretas criam sessão; perfil fica acessível; logout encerra', async () => {
  const cliente = criarCliente();
  await cliente('POST', '/auth/cadastro', { nome: 'Bruno', email: 'bruno@email.com', senha: 'minhasenha' });

  const semLogin = await cliente('GET', '/auth/perfil');
  assert.equal(semLogin.status, 401);

  const login = await cliente('POST', '/auth/login', { email: 'bruno@email.com', senha: 'minhasenha' });
  assert.equal(login.status, 200);
  assert.match(login.corpo.mensagem, /bem-vindo/i);

  const perfil = await cliente('GET', '/auth/perfil');
  assert.equal(perfil.status, 200);
  assert.equal(perfil.corpo.usuario.email, 'bruno@email.com');
  assert.equal(perfil.corpo.usuario.senha, undefined);

  const logout = await cliente('POST', '/auth/logout');
  assert.equal(logout.status, 200);

  const aposLogout = await cliente('GET', '/auth/perfil');
  assert.equal(aposLogout.status, 401);
});

test('login: senha incorreta e e-mail inexistente retornam 401 sem vazar qual campo errou', async () => {
  const cliente = criarCliente();
  await cliente('POST', '/auth/cadastro', { nome: 'Carla', email: 'carla@email.com', senha: 'correta' });

  const senhaErrada = await cliente('POST', '/auth/login', { email: 'carla@email.com', senha: 'errada' });
  assert.equal(senhaErrada.status, 401);
  assert.equal(senhaErrada.corpo.erro, 'E-mail ou senha incorretos.');

  const emailErrado = await cliente('POST', '/auth/login', { email: 'nao@existe.com', senha: 'x' });
  assert.equal(emailErrado.status, 401);
  assert.equal(emailErrado.corpo.erro, 'E-mail ou senha incorretos.');
});

test('login: campos obrigatórios ausentes retornam 400', async () => {
  const cliente = criarCliente();
  const r = await cliente('POST', '/auth/login', { email: 'so@email.com' });
  assert.equal(r.status, 400);
  assert.match(r.corpo.erro, /senha/);
});

// ---------------------------------------------------------------
// Produtos (busca pública; escrita exige login)
// ---------------------------------------------------------------

async function loginNovoUsuario(cliente, email) {
  await cliente('POST', '/auth/cadastro', { nome: 'Vendedor', email, senha: 'abc123' });
  await cliente('POST', '/auth/login', { email, senha: 'abc123' });
}

test('produtos: criação exige login (401 sem sessão)', async () => {
  const cliente = criarCliente();
  const r = await cliente('POST', '/produtos', { nome: 'X', preco: 1, categoria: 'c', estoque: 1 });
  assert.equal(r.status, 401);
  assert.match(r.corpo.erro, /login/i);
});

test('produtos: CRUD completo e buscas por nome/categoria/faixa de preço (parâmetros GET)', async () => {
  const cliente = criarCliente();
  await loginNovoUsuario(cliente, 'vendedor1@email.com');

  const criado = await cliente('POST', '/produtos', {
    nome: 'Notebook Gamer', preco: 4500, categoria: 'Informática', estoque: 10,
  });
  assert.equal(criado.status, 201);
  const id = criado.corpo.produto._id;

  await cliente('POST', '/produtos', { nome: 'Mouse sem fio', preco: 89.9, categoria: 'Informática', estoque: 50 });
  await cliente('POST', '/produtos', { nome: 'Cafeteira', preco: 199.9, categoria: 'Eletro', estoque: 5 });

  const porNome = await cliente('GET', '/produtos?nome=note');
  assert.equal(porNome.status, 200);
  assert.equal(porNome.corpo.total, 1);

  const porCategoria = await cliente('GET', '/produtos?categoria=Informática');
  assert.equal(porCategoria.corpo.total, 2);

  const porFaixa = await cliente('GET', '/produtos?precoMin=50&precoMax=250');
  assert.equal(porFaixa.corpo.total, 2);

  const porId = await cliente('GET', `/produtos/${id}`);
  assert.equal(porId.status, 200);
  assert.equal(porId.corpo.produto.nome, 'Notebook Gamer');

  const atualizado = await cliente('PUT', `/produtos/${id}`, { preco: 4200 });
  assert.equal(atualizado.status, 200);
  assert.equal(atualizado.corpo.produto.preco, 4200);

  const deletado = await cliente('DELETE', `/produtos/${id}`);
  assert.equal(deletado.status, 200);

  const aposDeletar = await cliente('GET', `/produtos/${id}`);
  assert.equal(aposDeletar.status, 404);
});

test('produtos: validações retornam 400 com mensagens claras', async () => {
  const cliente = criarCliente();
  await loginNovoUsuario(cliente, 'vendedor2@email.com');

  const semCampos = await cliente('POST', '/produtos', { nome: 'Incompleto' });
  assert.equal(semCampos.status, 400);
  assert.match(semCampos.corpo.erro, /obrigat/i);

  const precoNegativo = await cliente('POST', '/produtos', {
    nome: 'P', preco: -10, categoria: 'c', estoque: 1,
  });
  assert.equal(precoNegativo.status, 400);
  assert.match(precoNegativo.corpo.erro, /preco/);

  const idInvalido = await cliente('GET', '/produtos/id-invalido');
  assert.equal(idInvalido.status, 400);
  assert.match(idInvalido.corpo.erro, /ObjectId/i);

  const faixaInvertida = await cliente('GET', '/produtos?precoMin=300&precoMax=100');
  assert.equal(faixaInvertida.status, 400);
});

// ---------------------------------------------------------------
// Pedidos (todos exigem login; usuário vem da sessão)
// ---------------------------------------------------------------

test('pedidos: fluxo completo - criar, listar, status, cancelar com devolução de estoque', async () => {
  const cliente = criarCliente();
  await loginNovoUsuario(cliente, 'cliente1@email.com');

  const notebook = (await cliente('POST', '/produtos', {
    nome: 'Notebook P2', preco: 4500, categoria: 'info', estoque: 10,
  })).corpo.produto;
  const mouse = (await cliente('POST', '/produtos', {
    nome: 'Mouse P2', preco: 89.9, categoria: 'info', estoque: 50,
  })).corpo.produto;

  const pedido = await cliente('POST', '/pedidos', {
    itens: [
      { produtoId: notebook._id, quantidade: 1 },
      { produtoId: mouse._id, quantidade: 2 },
    ],
  });
  assert.equal(pedido.status, 201);
  assert.equal(pedido.corpo.pedido.total, 4679.8);
  assert.equal(pedido.corpo.pedido.status, 'pendente');
  const pedidoId = pedido.corpo.pedido._id;

  // Estoque baixado
  const estoqueNotebook = (await cliente('GET', `/produtos/${notebook._id}`)).corpo.produto.estoque;
  assert.equal(estoqueNotebook, 9);

  // Listagem do usuário logado
  const lista = await cliente('GET', '/pedidos');
  assert.equal(lista.corpo.total, 1);

  // Filtro por status (parâmetro GET)
  const pendentes = await cliente('GET', '/pedidos?status=pendente');
  assert.equal(pendentes.corpo.total, 1);

  // Atualização de status
  const aprovado = await cliente('PATCH', `/pedidos/${pedidoId}/status`, { status: 'aprovado' });
  assert.equal(aprovado.status, 200);
  assert.equal(aprovado.corpo.pedido.status, 'aprovado');

  // Cancelamento devolve estoque
  await cliente('PATCH', `/pedidos/${pedidoId}/status`, { status: 'cancelado' });
  const estoqueDevolvido = (await cliente('GET', `/produtos/${notebook._id}`)).corpo.produto.estoque;
  assert.equal(estoqueDevolvido, 10);
});

test('pedidos: validações e regras de negócio com mensagens de erro', async () => {
  const cliente = criarCliente();
  await loginNovoUsuario(cliente, 'cliente2@email.com');

  const semItens = await cliente('POST', '/pedidos', { itens: [] });
  assert.equal(semItens.status, 400);
  assert.match(semItens.corpo.erro, /itens/);

  const produto = (await cliente('POST', '/produtos', {
    nome: 'Raro', preco: 10, categoria: 'c', estoque: 2,
  })).corpo.produto;

  const estoqueInsuficiente = await cliente('POST', '/pedidos', {
    itens: [{ produtoId: produto._id, quantidade: 99 }],
  });
  assert.equal(estoqueInsuficiente.status, 400);
  assert.match(estoqueInsuficiente.corpo.erro, /estoque insuficiente/i);

  const pedidoOk = (await cliente('POST', '/pedidos', {
    itens: [{ produtoId: produto._id, quantidade: 1 }],
  })).corpo.pedido;

  const statusInvalido = await cliente('PATCH', `/pedidos/${pedidoOk._id}/status`, { status: 'finalizado' });
  assert.equal(statusInvalido.status, 400);
  assert.match(statusInvalido.corpo.erro, /status inválido/i);
});

test('pedidos: usuário não acessa pedidos de outro usuário (403)', async () => {
  const clienteA = criarCliente();
  await loginNovoUsuario(clienteA, 'dona@email.com');
  const produto = (await clienteA('POST', '/produtos', {
    nome: 'Item da dona', preco: 5, categoria: 'c', estoque: 3,
  })).corpo.produto;
  const pedido = (await clienteA('POST', '/pedidos', {
    itens: [{ produtoId: produto._id, quantidade: 1 }],
  })).corpo.pedido;

  const clienteB = criarCliente();
  await loginNovoUsuario(clienteB, 'intruso@email.com');
  const acesso = await clienteB('GET', `/pedidos/${pedido._id}`);
  assert.equal(acesso.status, 403);
  assert.match(acesso.corpo.erro, /outro usuário/i);

  const semLogin = criarCliente();
  const r = await semLogin('GET', '/pedidos');
  assert.equal(r.status, 401);
});

// ---------------------------------------------------------------
// Rota inexistente
// ---------------------------------------------------------------

test('rota inexistente retorna 404 em JSON', async () => {
  const cliente = criarCliente();
  const r = await cliente('GET', '/nao-existe');
  assert.equal(r.status, 404);
  assert.match(r.corpo.erro, /não encontrada/i);
});
