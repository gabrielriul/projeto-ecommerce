# Projeto 2 — Aplicação Web Express.js (E-commerce)

Projeto da disciplina **EC48B-C71 — Programação Web Back-End** — Engenharia de Computação, UTFPR Campus Cornélio Procópio.

Professores: Monique Emídio de Oliveira e Willian Massami Watanabe

## Organização do repositório

- **`main`** — Projeto 2: aplicação web Express.js (este README);
- **branch [`projeto1`](https://github.com/gabrielriul/projeto-ecommerce/tree/projeto1)** — Projeto 1: biblioteca de acesso a SGBD, exatamente como entregue.

O histórico da `main` preserva a evolução: commits do Projeto 1 seguidos dos commits do Projeto 2.

## Integrantes da equipe

- Gabriel Riul Perissé — RA 2064430

## Descrição

Aplicação web (**API JSON**) desenvolvida com **Express.js** sobre a biblioteca de acesso a SGBD (MongoDB) implementada no [Projeto 1](https://github.com/gabrielriul/projeto-ecommerce/tree/projeto1) (branch `projeto1` deste repositório), mantendo a temática **e-commerce**. As classes do Projeto 1 estão em `lib/` e implementam as regras de negócio; a aplicação Express implementa as **rotas**, o **recebimento de parâmetros GET/POST** e o **uso de sessões** para garantir a autenticidade dos usuários.

Arquitetura **MVC**: `routes/` (rotas) → `controllers/` (controle) → `lib/models/` (modelo, Projeto 1).

```
projeto2-ecommerce/
├── server.js                 # ponto de entrada (conecta ao MongoDB e sobe o Express)
├── app.js                    # configuração do Express (sessões, rotas, tratador de erros)
├── lib/                      # biblioteca do Projeto 1 (Database, Usuario, Produto, Pedido...)
├── controllers/              # AuthController, ProdutoController, PedidoController
├── routes/                   # auth.js, produtos.js, pedidos.js
├── middlewares/
│   ├── autenticacao.js       # exige sessão ativa (401 sem login)
│   └── tratadorDeErros.js    # exceções da lib -> respostas HTTP com mensagens de erro
├── utils/Senha.js            # hash de senha (crypto nativo: scrypt + salt)
├── test/                     # testes da API (node:test) + smoke test com MongoDB real
└── requests.http             # requisições prontas para teste manual
```

## Rotas

| Método | Rota                  | Autenticação | Descrição                                              |
| ------ | --------------------- | ------------ | ------------------------------------------------------ |
| POST   | `/auth/cadastro`      | —            | Cadastra usuário `{nome, email, senha}`                |
| POST   | `/auth/login`         | —            | Confere credenciais e **cria a sessão**                |
| POST   | `/auth/logout`        | —            | Encerra a sessão                                       |
| GET    | `/auth/perfil`        | sessão       | Dados do usuário logado                                |
| GET    | `/produtos`           | —            | Busca: `?nome=`, `?categoria=`, `?precoMin=&precoMax=` |
| GET    | `/produtos/:id`       | —            | Detalha um produto                                     |
| POST   | `/produtos`           | sessão       | Cadastra produto `{nome, preco, categoria, estoque}`   |
| PUT    | `/produtos/:id`       | sessão       | Atualiza produto                                       |
| DELETE | `/produtos/:id`       | sessão       | Remove produto                                         |
| POST   | `/pedidos`            | sessão       | Cria pedido `{itens:[{produtoId, quantidade}]}` — o usuário vem da sessão; valida estoque e calcula o total |
| GET    | `/pedidos?status=`    | sessão       | Pedidos do usuário logado                              |
| GET    | `/pedidos/:id`        | sessão       | Detalha pedido (somente do próprio usuário)            |
| PATCH  | `/pedidos/:id/status` | sessão       | Atualiza status; cancelamento devolve o estoque        |
| DELETE | `/pedidos/:id`        | sessão       | Remove pedido (somente do próprio usuário)             |

Erros retornam JSON com mensagem clara e status adequado: `400` validação (inclui a lista de `campos`), `401` não autenticado, `403` recurso de outro usuário, `404` não encontrado, `500` falha interna. Exceções são registradas em `logs/erros.log` (rotina da biblioteca do Projeto 1).

## Pré-requisitos

- Node.js 18+ e MongoDB em execução

## Instalação e execução

```bash
npm install

# Opcional (padrões: mongodb://localhost:27017 / banco "ecommerce")
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DB="ecommerce"
export SESSION_SECRET="um-segredo-forte"

npm start          # produção: node server.js
npm run dev        # desenvolvimento: nodemon server.js
```

Servidor em `http://localhost:3000`. Use o arquivo `requests.http` (VS Code REST Client) ou os exemplos abaixo:

```bash
# Cadastro
curl -X POST http://localhost:3000/auth/cadastro -H 'Content-Type: application/json' \
  -d '{"nome":"Ana","email":"ana@email.com","senha":"senha123"}'

# Login guardando o cookie de sessão
curl -c cookies.txt -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@email.com","senha":"senha123"}'

# Rota protegida usando a sessão
curl -b cookies.txt http://localhost:3000/auth/perfil
```

## Testes

```bash
npm test              # testes da API com banco simulado (node:test, sem dependências extras)
bash test/smoke.sh    # fluxo completo via curl contra MongoDB real
```

O repositório inclui CI (GitHub Actions) que executa os testes e o smoke test contra um MongoDB 7 real a cada push.

## Critérios de avaliação atendidos

- [x] Casos de uso da temática (e-commerce): cadastro/busca de produtos, pedidos com estoque e total, fluxo de status;
- [x] Rotas com recebimento de parâmetros **GET** (query/rota) e **POST** (corpo JSON/formulário);
- [x] **Sessões** (`express-session`) garantindo a autenticidade dos usuários;
- [x] **Rotina de login** (cadastro, login com hash de senha, logout, perfil) bloqueando rotas protegidas (401);
- [x] Verificação de campos obrigatórios com **apresentação de mensagens de erro** (JSON, status 400 + campos);
- [x] Tratamento de exceções e log em arquivo (biblioteca do Projeto 1).

## Dependências

| Pacote            | Uso                                            |
| ----------------- | ---------------------------------------------- |
| `express`         | Framework web (rotas, middlewares)             |
| `express-session` | Sessões de usuário (autenticidade após login)  |
| `mongodb`         | Driver oficial do MongoDB (biblioteca do P1)   |
| `nodemon` (dev)   | Reinício automático em desenvolvimento         |

Hash de senha com o módulo **nativo** `crypto` (scrypt + salt) — nenhuma biblioteca externa adicional.
