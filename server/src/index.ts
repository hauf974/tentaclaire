import { buildServer } from './app.js';

const PORT = Number(process.env.PORT ?? 3000);

const { app, stop } = await buildServer();

await app.listen({ port: PORT, host: '0.0.0.0' });

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'arrêt du serveur demandé');
  try {
    await stop();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "erreur pendant l'arrêt du serveur");
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
