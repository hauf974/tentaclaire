import { defaultGameConfig } from '@tentaclaire/shared';
import type {
  FeedAddPayload,
  HelloAckPayload,
  JoinAckPayload,
} from '@tentaclaire/shared';
import { type Socket, io as ioClient } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer, type BuiltServer } from './app.js';
import { createTempUploadDir, removeTempDir } from './testSupport.js';

function serverUrl(built: BuiltServer): string {
  const address = built.app.server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur inattendue');
  return `http://127.0.0.1:${address.port}`;
}

function connect(url: string): Socket {
  return ioClient(url, { transports: ['websocket'] });
}

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
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

describe('protocole joueur et écran (ticket 2.3)', () => {
  it('deux joueurs jouent une mini-partie : join, doublon suffixé, input -> feed_add', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ config: { ...defaultGameConfig, gridCols: 6, gridRows: 6, ghostCount: 0 }, uploadDir });
    await built.app.listen({ port: 0, host: '127.0.0.1' });
    const url = serverUrl(built);

    const alice = connect(url);
    clients.push(alice);
    await once(alice, 'connect');
    alice.emit('hello', { role: 'player' });
    const aliceHello = await once<HelloAckPayload>(alice, 'hello_ack');
    expect(aliceHello.session).toBeNull();

    alice.emit('join', { pseudo: 'Alex' });
    const aliceJoin = await once<JoinAckPayload>(alice, 'join_ack');
    expect(aliceJoin.pseudo).toBe('Alex');

    const bob = connect(url);
    clients.push(bob);
    await once(bob, 'connect');
    bob.emit('hello', { role: 'player' });
    await once(bob, 'hello_ack');
    bob.emit('join', { pseudo: 'Alex' }); // doublon
    const bobJoin = await once<JoinAckPayload>(bob, 'join_ack');
    expect(bobJoin.pseudo).toBe('Alex_1');

    built.game.reset();
    built.game.launch();

    const feedPromise = once<FeedAddPayload>(alice, 'feed_add');
    alice.emit('input', { direction: 'up' });
    const feedEvent = await feedPromise;
    expect(feedEvent.entry.pseudo).toBe('Alex');
    expect(feedEvent.entry.direction).toBe('up');
  });

  it('reconnexion par token : même pseudo restitué', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ config: defaultGameConfig, uploadDir });
    await built.app.listen({ port: 0, host: '127.0.0.1' });
    const url = serverUrl(built);

    const first = connect(url);
    clients.push(first);
    await once(first, 'connect');
    first.emit('hello', { role: 'player' });
    await once(first, 'hello_ack');
    first.emit('join', { pseudo: 'Bob' });
    const { token } = await once<JoinAckPayload>(first, 'join_ack');
    first.disconnect();

    const second = connect(url);
    clients.push(second);
    await once(second, 'connect');
    second.emit('hello', { role: 'player', token });
    const ack = await once<HelloAckPayload>(second, 'hello_ack');
    expect(ack.session).toEqual({ token, pseudo: 'Bob' });
  });

  it('token expiré : session null au hello', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ config: defaultGameConfig, uploadDir });
    await built.app.listen({ port: 0, host: '127.0.0.1' });
    const url = serverUrl(built);

    // Session déjà expirée (createdAt il y a plus de 8h), créée directement via le store.
    const expired = built.sessions.join('Carol', Date.now() - 9 * 60 * 60 * 1000);

    const client = connect(url);
    clients.push(client);
    await once(client, 'connect');
    client.emit('hello', { role: 'player', token: expired.token });
    const ack = await once<HelloAckPayload>(client, 'hello_ack');
    expect(ack.session).toBeNull();
  });
});
