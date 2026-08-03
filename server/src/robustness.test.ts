import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Socket, io as ioClient } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer, type BuiltServer } from './app.js';
import { createTempUploadDir, removeTempDir } from './testSupport.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function serverUrl(built: BuiltServer): string {
  const address = built.app.server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur inattendue');
  return `http://127.0.0.1:${address.port}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let built: BuiltServer | null = null;
let uploadDir: string | null = null;
const clients: Socket[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await built?.stop();
  built = null;
  if (uploadDir) removeTempDir(uploadDir);
  uploadDir = null;
});

describe('robustesse — fuzzing des événements socket (ticket 2.7)', () => {
  it('des payloads absurdes sur hello/join/input ne font jamais planter le serveur', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ uploadDir });
    await built.app.listen({ port: 0, host: '127.0.0.1' });

    const client = ioClient(serverUrl(built), { transports: ['websocket'] });
    clients.push(client);
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));

    const garbagePayloads: unknown[] = [
      undefined,
      null,
      42,
      'juste une chaîne',
      [],
      [1, 2, 3],
      {},
      { role: 123 },
      { role: 'player', token: 42 },
      { role: 'player', token: { nested: true } },
      { pseudo: 42 },
      { pseudo: null },
      { pseudo: 'x'.repeat(100_000) },
      { pseudo: '   ' },
      { direction: 'diagonale' },
      { direction: 42 },
      { direction: ['up'] },
      { __proto__: { polluted: true } },
      { toString: () => 'boom' },
    ];

    for (const payload of garbagePayloads) {
      client.emit('hello', payload);
      client.emit('join', payload);
      client.emit('input', payload);
    }

    await wait(200);

    // Le serveur est toujours vivant et répond normalement après le fuzzing.
    const health = await built.app.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200);

    const helloAck = new Promise((resolve) => client.once('hello_ack', resolve));
    client.emit('hello', { role: 'player' });
    await expect(helloAck).resolves.toBeDefined();
  });
});

describe('robustesse — arrêt gracieux SIGTERM (ticket 2.7)', () => {
  it(
    'kill -TERM arrête le process proprement (exit code 0)',
    async () => {
      const port = 31000 + Math.floor(Math.random() * 5000);
      const serverEntry = join(__dirname, 'index.ts');
      const uploadDirForChild = createTempUploadDir();
      // Binaire tsx invoqué directement (pas via `npx`, qui ajoute une couche
      // de process supplémentaire et perturbe la transmission du signal / du
      // code de sortie).
      const tsxBin = join(__dirname, '..', '..', 'node_modules', '.bin', 'tsx');

      const child = spawn(tsxBin, [serverEntry], {
        cwd: join(__dirname, '..'),
        env: { ...process.env, PORT: String(port), UPLOAD_DIR: uploadDirForChild },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      try {
        // Attend que le serveur réponde.
        const deadline = Date.now() + 10_000;
        let ready = false;
        while (Date.now() < deadline && !ready) {
          try {
            const response = await fetch(`http://127.0.0.1:${port}/api/health`);
            if (response.ok) ready = true;
          } catch {
            // pas encore prêt
          }
          if (!ready) await wait(100);
        }
        expect(ready).toBe(true);

        const exitPromise = new Promise<number | null>((resolve) => {
          child.on('exit', (code) => resolve(code));
        });

        child.kill('SIGTERM');
        const code = await Promise.race([exitPromise, wait(5000).then(() => 'timeout' as const)]);

        expect(code).toBe(0); // 'timeout' !== 0 aurait échoué l'assertion
      } finally {
        if (!child.killed) child.kill('SIGKILL');
        removeTempDir(uploadDirForChild);
      }
    },
    20_000,
  );
});
