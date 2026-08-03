import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

const app = Fastify({ logger: true });

app.get('/api/health', async () => ({ ok: true }));

// Le client Vite est buildé dans client/dist, servi tel quel par Fastify
// (absent en dev tant que le ticket 0.4 / le mode dev ne l'ont pas construit).
const clientDist = join(__dirname, '../../client/dist');
if (existsSync(clientDist)) {
  await app.register(fastifyStatic, { root: clientDist });
}

await app.ready();

const io = new SocketIOServer(app.server);

io.on('connection', (socket) => {
  app.log.info({ id: socket.id }, 'socket connecté');
});

await app.listen({ port: PORT, host: '0.0.0.0' });
