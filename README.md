# Projeto 1 — Biblioteca de acesso a SGBD (E-commerce)

Projeto da disciplina **EC48B-C71 — Programação Web Back-End** — Engenharia de Computação, UTFPR Campus Cornélio Procópio.

Professores: Monique Emídio de Oliveira e Willian Massami Watanabe

## Integrantes da equipe

- Gabriel Riul Perissé — RA 2064430

## Descrição

Biblioteca de classes em **Node.js** para acesso a SGBD (**MongoDB**, via driver oficial `mongodb`), com a temática **e-commerce** (como o Mercado Livre), com foco em armazenamento e busca de produtos em uma loja.

A biblioteca implementa **3 classes de armazenamento** (coleções no banco):

| Classe    | Coleção    | Campos obrigatórios            | Principais buscas                                   |
| --------- | ---------- | ------------------------------ | --------------------------------------------------- |
| `Usuario` | `usuarios` | nome, email, senha             | por id, por e-mail, por nome                        |
| `Produto` | `produtos` | nome, preco, categoria, estoque| por id, por nome, por categoria, por faixa de preço |
| `Pedido`  | `pedidos`  | usuarioId, itens               | por id, por usuário, por status                     |

Todas as classes implementam métodos de **inserção**, **busca**, **atualização** e **deleção**, com:

- **Verificação de preenchimento de campos obrigatórios** (`utils/Validator.js`), lançando `ValidationError`;
- **Tratamento de exceções** lançadas pelo driver do MongoDB (ex.: e-mail duplicado por índice único, falha de conexão), encapsuladas em `DatabaseError`/`NotFoundError`;
- **Log das exceções capturadas em arquivo** (`utils/Logger.js` → `logs/erros.log`).

Regras de negócio da temática: criação de pedido valida usuário, produtos e estoque, calcula o total com os preços atuais e baixa o estoque; cancelamento de pedido devolve o estoque.

## Estrutura do projeto

```
projeto1-ecommerce/
├── index.js              # ponto de entrada da biblioteca (exporta as classes)
├── demo.js               # demonstração dos casos de uso (inclui casos de erro)
├── config/
│   └── Database.js       # conexão com o MongoDB (driver oficial)
├── models/
│   ├── Usuario.js        # entidade Usuário
│   ├── Produto.js        # entidade Produto
│   └── Pedido.js         # entidade Pedido
├── utils/
│   ├── Validator.js      # validação de campos obrigatórios
│   └── Logger.js         # gravação de exceções em arquivo de log
├── errors/
│   ├── ValidationError.js
│   ├── NotFoundError.js
│   └── DatabaseError.js
└── logs/
    └── erros.log         # gerado em tempo de execução
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [MongoDB](https://www.mongodb.com/) em execução (local ou remoto)

## Instalação e execução

```bash
# 1. Instalar as dependências (somente o driver oficial do MongoDB)
npm install

# 2. (Opcional) Configurar a conexão — padrão: mongodb://localhost:27017 / banco "ecommerce"
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DB="ecommerce"

# 3. Executar a demonstração dos casos de uso
npm run demo
```

A demonstração executa o fluxo completo da loja e também **casos de erro propositais** (campos obrigatórios ausentes, e-mail inválido/duplicado, estoque insuficiente, ids inválidos, registros inexistentes). Cada exceção capturada é registrada em `logs/erros.log` no formato:

```
[2026-06-05T17:40:00.000Z] [Usuario.inserir] ValidationError: Campos obrigatórios ausentes ou vazios: email, senha.
Stack: ...
--------------------------------------------------------------------------------
```

## Exemplo de uso da biblioteca

```js
const { Database, Usuario, Produto, Pedido } = require('./index');

async function exemplo() {
  const database = new Database(); // usa MONGO_URI / MONGO_DB ou os padrões
  await database.conectar();

  const usuarios = new Usuario(database);
  const produtos = new Produto(database);
  const pedidos = new Pedido(database);

  const usuario = await usuarios.inserir({ nome: 'Ana', email: 'ana@email.com', senha: '123' });
  const produto = await produtos.inserir({ nome: 'Mouse', preco: 89.9, categoria: 'informática', estoque: 10 });

  const pedido = await pedidos.inserir({
    usuarioId: usuario._id,
    itens: [{ produtoId: produto._id, quantidade: 2 }],
  });

  console.log(await pedidos.buscarPorUsuario(usuario._id));

  await database.desconectar();
}

exemplo();
```

## Critérios de avaliação atendidos

- [x] Implementação dos casos de uso da temática selecionada (e-commerce);
- [x] Pelo menos 3 classes de armazenamento (`usuarios`, `produtos`, `pedidos`);
- [x] Verificação de preenchimento de campos obrigatórios;
- [x] Tratamento de exceções lançadas pelas bibliotecas;
- [x] Armazenamento de arquivos de log com as exceções capturadas.

## Dependências

| Pacote    | Uso                                      |
| --------- | ---------------------------------------- |
| `mongodb` | Driver oficial do MongoDB para Node.js   |

Nenhuma outra biblioteca externa é utilizada (logs e validações usam somente módulos nativos do Node.js).
