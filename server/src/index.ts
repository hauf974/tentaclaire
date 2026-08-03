import { buildServer } from './app.js';

const PORT = Number(process.env.PORT ?? 3000);

const { app } = await buildServer();

await app.listen({ port: PORT, host: '0.0.0.0' });
