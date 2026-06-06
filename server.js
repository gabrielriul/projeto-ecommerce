/**
 * Ponto de entrada da aplicação.
 * Conecta ao MongoDB (biblioteca do Projeto 1) e sobe o servidor Express.
 */
const { Database } = require('./lib');
const criarApp = require('./app');

const PORTA = process.env.PORT || 3000;

async function main() {
  const database = new Database(); // usa MONGO_URI / MONGO_DB ou os padrões
  await database.conectar();
  console.log(`Conectado ao MongoDB (banco: ${database.nomeBanco})`);

  const app = criarApp(database);
  app.listen(PORTA, () => {
    console.log(`Servidor em execução: http://localhost:${PORTA}`);
  });

  // Encerramento gracioso
  for (const sinal of ['SIGINT', 'SIGTERM']) {
    process.on(sinal, async () => {
      console.log(`\nEncerrando (${sinal})...`);
      await database.desconectar();
      process.exit(0);
    });
  }
}

main().catch((erro) => {
  console.error(`Falha ao iniciar a aplicação: ${erro.message}`);
  process.exit(1);
});
