const { Usuario, ValidationError, NotFoundError } = require('../lib');
const Senha = require('../utils/Senha');

/**
 * Controller de autenticação: cadastro, login (cria a sessão),
 * logout (destrói a sessão) e perfil do usuário logado.
 */
class AuthController {
  /**
   * @param {import('../lib').Database} database
   */
  constructor(database) {
    this.usuarios = new Usuario(database);
  }

  /** POST /auth/cadastro — cria um novo usuário (senha armazenada com hash). */
  cadastro = async (req, res, next) => {
    try {
      const { nome, email, senha, telefone, endereco } = req.body;

      // Valida ANTES de gerar o hash, para que a mensagem de campos
      // obrigatórios chegue correta ao usuário.
      if (senha === undefined || senha === null || String(senha).trim() === '') {
        throw new ValidationError('Campos obrigatórios ausentes ou vazios: senha.', ['senha']);
      }

      const usuario = await this.usuarios.inserir({
        nome,
        email,
        senha: Senha.gerarHash(String(senha)),
        telefone,
        endereco,
      });

      res.status(201).json({
        mensagem: 'Usuário cadastrado com sucesso.',
        usuario: { _id: usuario._id, nome: usuario.nome, email: usuario.email },
      });
    } catch (erro) {
      next(erro);
    }
  };

  /** POST /auth/login — confere as credenciais e registra o usuário na sessão. */
  login = async (req, res, next) => {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        throw new ValidationError(
          'Campos obrigatórios ausentes ou vazios: ' +
            [!email && 'email', !senha && 'senha'].filter(Boolean).join(', ') + '.',
          [!email && 'email', !senha && 'senha'].filter(Boolean)
        );
      }

      let usuario;
      try {
        usuario = await this.usuarios.buscarPorEmail(email);
      } catch (erro) {
        // Não revela se o e-mail existe ou não
        if (erro instanceof NotFoundError) {
          return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
        }
        throw erro;
      }

      if (!Senha.verificar(String(senha), usuario.senha)) {
        return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
      }

      // Sessão: identifica o usuário nas próximas requisições
      req.session.usuarioId = String(usuario._id);
      req.session.nome = usuario.nome;

      res.json({
        mensagem: `Login realizado com sucesso. Bem-vindo(a), ${usuario.nome}!`,
        usuario: { _id: usuario._id, nome: usuario.nome, email: usuario.email },
      });
    } catch (erro) {
      next(erro);
    }
  };

  /** POST /auth/logout — encerra a sessão do usuário. */
  logout = (req, res, next) => {
    req.session.destroy((erro) => {
      if (erro) return next(erro);
      res.clearCookie('connect.sid');
      res.json({ mensagem: 'Logout realizado com sucesso.' });
    });
  };

  /** GET /auth/perfil — dados do usuário logado (sem a senha). */
  perfil = async (req, res, next) => {
    try {
      const usuario = await this.usuarios.buscarPorId(req.session.usuarioId);
      const { senha, ...usuarioSemSenha } = usuario;
      res.json({ usuario: usuarioSemSenha });
    } catch (erro) {
      next(erro);
    }
  };
}

module.exports = AuthController;
