import { defaultGameConfig } from '@tentaclaire/shared';
import { type Socket, io as ioClient } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer, type BuiltServer } from './app.js';
import { createTempUploadDir, removeTempDir } from './testSupport.js';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serverUrl(built: BuiltServer): string {
  const address = built.app.server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur inattendue');
  return `http://127.0.0.1:${address.port}`;
}

let built: BuiltServer | null = null;
let client: Socket | null = null;
let uploadDir: string | null = null;

afterEach(async () => {
  client?.disconnect();
  client = null;
  await built?.stop();
  built = null;
  if (uploadDir) removeTempDir(uploadDir);
  uploadDir = null;
});

describe('boucle serveur (ticket 2.1)', () => {
  it("aucun delta n'est émis quand rien ne bouge (phase idle)", async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ config: { ...defaultGameConfig, ghostCount: 0 }, uploadDir });
    await built.app.listen({ port: 0, host: '127.0.0.1' });

    const deltas: unknown[] = [];
    client = ioClient(serverUrl(built), { transports: ['websocket'] });
    client.on('state_delta', (payload) => deltas.push(payload));

    await new Promise<void>((resolve) => client?.on('connect', () => resolve()));
    await wait(250); // ~2-3 ticks de 100ms

    // Au plus un delta (l'amorçage initial, prev=null) ; rien ne bouge en idle ensuite.
    expect(deltas.length).toBeLessThanOrEqual(1);

    const countAfterIdle = deltas.length;
    await wait(250);
    expect(deltas.length).toBe(countAfterIdle); // toujours rien de nouveau
  });

  it('le timer diffusé décroît correctement une fois la partie lancée', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ config: { ...defaultGameConfig, ghostCount: 0, timerSeconds: 300 }, uploadDir });
    await built.app.listen({ port: 0, host: '127.0.0.1' });

    const deltas: { timerRemainingMs?: number }[] = [];
    client = ioClient(serverUrl(built), { transports: ['websocket'] });
    client.on('state_delta', (payload) => deltas.push(payload));
    const gameEvents: string[] = [];
    client.on('game_event', (payload: { type: string }) => gameEvents.push(payload.type));

    await new Promise<void>((resolve) => client?.on('connect', () => resolve()));
    await wait(50);

    built.game.reset();
    built.game.launch();

    await wait(350); // plusieurs ticks pendant que la partie tourne

    expect(gameEvents).toContain('reset');
    const timerValues = deltas.map((d) => d.timerRemainingMs).filter((v): v is number => v !== undefined);
    expect(timerValues.length).toBeGreaterThan(0);
    expect(timerValues[timerValues.length - 1]).toBeLessThan(timerValues[0]);
  });
});
