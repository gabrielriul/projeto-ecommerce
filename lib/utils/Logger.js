const fs = require('fs');
const path = require('path');

/**
 * Classe responsável pelo registro (log) das exceções capturadas
 * pela biblioteca em arquivo, conforme exigido na proposta do projeto.
 *
 * Os erros são gravados em logs/erros.log no formato:
 * [data/hora ISO] [ORIGEM.metodo] NomeDoErro: mensagem
 * Stack: ...
 */
class Logger {
  /** Diretório onde os arquivos de log são armazenados.
   *  (Adaptação para o Projeto 2: usa a raiz do projeto em execução,
   *  configurável pela variável de ambiente LOG_DIR.) */
  static get diretorioLogs() {
    return process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  }

  /** Caminho completo do arquivo de log de erros */
  static get arquivoErros() {
    return path.join(Logger.diretorioLogs, 'erros.log');
  }

  /**
   * Registra uma exceção capturada no arquivo de log.
   * @param {string} origem - nome da classe onde o erro ocorreu (ex.: 'Usuario')
   * @param {string} metodo - nome do método onde o erro ocorreu (ex.: 'inserir')
   * @param {Error} erro - exceção capturada
   */
  static registrarErro(origem, metodo, erro) {
    try {
      // Garante que o diretório de logs exista
      fs.mkdirSync(Logger.diretorioLogs, { recursive: true });

      const dataHora = new Date().toISOString();
      const nomeErro = erro && erro.name ? erro.name : 'Error';
      const mensagem = erro && erro.message ? erro.message : String(erro);
      const stack = erro && erro.stack ? erro.stack : 'sem stack disponível';

      const linha =
        `[${dataHora}] [${origem}.${metodo}] ${nomeErro}: ${mensagem}\n` +
        `Stack: ${stack}\n` +
        `${'-'.repeat(80)}\n`;

      fs.appendFileSync(Logger.arquivoErros, linha, { encoding: 'utf-8' });
    } catch (erroDeLog) {
      // Último recurso: se não for possível gravar o log em arquivo,
      // exibe no console para não silenciar a falha original.
      console.error('[Logger] Falha ao gravar arquivo de log:', erroDeLog.message);
    }
  }
}

module.exports = Logger;
