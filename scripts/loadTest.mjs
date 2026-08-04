// Test de charge (ticket 7.3) : 50 joueurs simulés, ~2 inputs/s chacun,
// pendant 5 minutes, contre un serveur de production déjà lancé et configuré
// (`node server/dist/index.js`). Mesure la latence entre l'émission d'un
// `input` et le prochain `state_delta` reçu (proxy de réactivité de la
// boucle de diffusion sous charge — le serveur tique déjà en continu,
// timer/fantômes, donc un delta arrive de toute façon très vite ; ce n'est
// pas une garantie que CE delta reflète spécifiquement cet input, mais une
// mesure honnête du temps de réponse perçu par le client), et compte les
// déconnexions inattendues.
//
// Usage : node scripts/loadTest.mjs
// Variables d'environnement : LOAD_TEST_URL (défaut http://localhost:3000),
// ADMIN_PASSWORD (défaut tentaclaire), PLAYER_COUNT (défaut 50),
// DURATION_MS (défaut 300000).

import { io } from 'socket.io-client';

const SERVER_URL = process.env.LOAD_TEST_URL ?? 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'tentaclaire';
const PLAYER_COUNT = Number(process.env.PLAYER_COUNT ?? 50);
const DURATION_MS = Number(process.env.DURATION_MS ?? 5 * 60 * 1000);
const INPUT_INTERVAL_MS = 500; // ~2 inputs/s
const DIRECTIONS = ['up', 'down', 'left', 'right'];

async function configureGame() {
  const loginRes = await fetch(`${SERVER_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`login admin a échoué (${loginRes.status})`);
  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = setCookie.split(';')[0];

  const configRes = await fetch(`${SERVER_URL}/api/admin/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      gridAuto: false,
      gridCols: 30,
      gridRows: 30,
      ghostCount: 10,
      ghostSpeed: 2,
      movementMode: 'chaos',
      chaosCooldownMs: 200,
      timerSeconds: 3600,
    }),
  });
  if (!configRes.ok) throw new Error(`config admin a échoué (${configRes.status})`);

  await fetch(`${SERVER_URL}/api/admin/game/reset`, { method: 'POST', headers: { cookie } });
  await fetch(`${SERVER_URL}/api/admin/game/launch`, { method: 'POST', headers: { cookie } });
}

function createPlayer(index) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    const stats = { latencies: [], disconnects: 0, connectErrors: 0 };
    let lastInputAt = 0;
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`joueur ${index} : timeout de connexion/join`));
      }
    }, 10_000);

    socket.on('connect', () => socket.emit('hello', { role: 'player' }));
    socket.on('hello_ack', () => socket.emit('join', { pseudo: `Load${index}` }));
    socket.on('join_ack', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({
          socket,
          stats,
          sendInput() {
            lastInputAt = Date.now();
            socket.emit('input', { direction: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)] });
          },
        });
      }
    });
    socket.on('state_delta', () => {
      if (lastInputAt > 0) {
        stats.latencies.push(Date.now() - lastInputAt);
        lastInputAt = 0;
      }
    });
    socket.on('disconnect', (reason) => {
      stats.disconnects++;
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`joueur ${index} : déconnecté avant join (${reason})`));
      }
    });
    socket.on('connect_error', (err) => {
      stats.connectErrors++;
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

async function main() {
  console.log(`Configuration de la partie via ${SERVER_URL}...`);
  await configureGame();

  console.log(`Connexion de ${PLAYER_COUNT} joueurs simulés...`);
  const players = await Promise.all(Array.from({ length: PLAYER_COUNT }, (_, i) => createPlayer(i)));
  console.log(`${players.length} joueurs connectés et rejoints. Envoi d'inputs pendant ${DURATION_MS / 1000}s...`);

  const intervals = players.map((player) => setInterval(player.sendInput, INPUT_INTERVAL_MS));

  await new Promise((resolve) => setTimeout(resolve, DURATION_MS));

  for (const interval of intervals) clearInterval(interval);

  const allLatencies = players.flatMap((p) => p.stats.latencies).sort((a, b) => a - b);
  const totalDisconnects = players.reduce((sum, p) => sum + p.stats.disconnects, 0);
  const totalConnectErrors = players.reduce((sum, p) => sum + p.stats.connectErrors, 0);
  const totalInputs = allLatencies.length;

  const result = {
    playerCount: players.length,
    durationMs: DURATION_MS,
    totalLatencySamples: totalInputs,
    latencyMsP50: percentile(allLatencies, 50),
    latencyMsP95: percentile(allLatencies, 95),
    latencyMsP99: percentile(allLatencies, 99),
    latencyMsMax: allLatencies.length > 0 ? allLatencies[allLatencies.length - 1] : null,
    unexpectedDisconnects: totalDisconnects,
    connectErrors: totalConnectErrors,
  };

  console.log(JSON.stringify(result, null, 2));

  for (const player of players) player.socket.disconnect();
  process.exit(totalDisconnects > 0 || totalConnectErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test de charge en échec :', err);
  process.exit(1);
});
