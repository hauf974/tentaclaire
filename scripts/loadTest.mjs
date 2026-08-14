// Test de charge (ticket 7.3 + extension pilotage intelligent, hors lot) :
// N joueurs simulés (`socket.io-client`, sans navigateur — le personnage est
// unique et partagé, piloté par vote/input, donc un client léger par joueur
// suffit à charger le serveur réellement, sans le coût de N instances
// Chromium) envoient un `input` à intervalle régulier.
//
// Ne touche JAMAIS aux routes admin (login/config/reset/launch) : ce script
// se contente de connecter des joueurs et d'envoyer des entrées, exactement
// comme de vrais téléphones — le pilotage (grille, fantômes, lancer/pause,
// et désormais le pilotage à chaud) reste entièrement entre les mains de
// l'exploitant depuis le dashboard /admin, y compris PENDANT le test. Les
// rôles `player`/`screen` ne nécessitent aucune authentification côté
// serveur (seules les routes /api/admin/* sont protégées) : aucun mot de
// passe n'est donc requis pour ce script.
//
// Interruption : Ctrl+C (SIGINT) à tout moment — affiche les statistiques
// collectées jusque-là, déconnecte proprement tous les joueurs, et quitte.
// Sans DURATION_MS, le script tourne indéfiniment jusqu'à interruption.
//
// BOT_STRATEGY : au lieu d'une direction aléatoire (comportement historique,
// ticket 7.3), les joueurs simulés peuvent viser un objectif commun,
// recalculé en continu à partir de l'état RÉEL de la partie (un connecteur
// d'observation dédié, rôle `screen`, suit `snapshot`/`state_delta` sans
// consommer de "place joueur") :
//   - 'random'  (défaut) : direction aléatoire, comportement historique.
//   - 'nearest' : direction vers la case non découverte la plus proche
//                 (distance de Manhattan, plateau ouvert sans obstacle).
//   - 'density' : direction vers le bloc de la grille (partitionnée en
//                 blocs ~carrés) contenant le plus de cases non découvertes
//                 — approxime "la zone la plus dense" sans clustering coûteux.
// Le déplacement du personnage n'est PAS toroïdal (mur = immobile, contraire
// aux fantômes) : la direction gagnante est un simple pas glouton vers la
// cible, jamais un raccourci par le bord. Si la partie n'est pas `running`
// (pas encore lancée depuis l'admin, ou entre deux manches), les entrées
// sont simplement sans effet côté serveur — le script continue d'essayer,
// prêt dès que l'admin clique "Lancer".
//
// Usage : node scripts/loadTest.mjs
// Variables d'environnement :
//   LOAD_TEST_URL     (défaut http://localhost:3000)
//   PLAYER_COUNT       (défaut 50)
//   DURATION_MS        (optionnel — sans elle, tourne jusqu'à Ctrl+C)
//   BOT_STRATEGY       (défaut 'random') : 'random' | 'nearest' | 'density'
//   INPUT_INTERVAL_MS  (défaut 500, ~2 inputs/s par joueur)
//   STATS_INTERVAL_MS  (défaut 5000 — affichage périodique en direct)

import { io } from 'socket.io-client';

const SERVER_URL = process.env.LOAD_TEST_URL ?? 'http://localhost:3000';
const PLAYER_COUNT = Number(process.env.PLAYER_COUNT ?? 50);
const DURATION_MS = process.env.DURATION_MS ? Number(process.env.DURATION_MS) : null;
const BOT_STRATEGY = process.env.BOT_STRATEGY ?? 'random';
const INPUT_INTERVAL_MS = Number(process.env.INPUT_INTERVAL_MS ?? 500);
const STATS_INTERVAL_MS = Number(process.env.STATS_INTERVAL_MS ?? 5000);
const DIRECTIONS = ['up', 'down', 'left', 'right'];

// Mis à true juste avant les déconnexions volontaires de fin de test, pour
// ne pas les compter comme des déconnexions "inattendues" dans le rapport.
let shuttingDown = false;

// ---------- Pilotage intelligent (BOT_STRATEGY 'nearest' / 'density') ----------

/** Pas glouton (non-toroïdal, contrairement aux fantômes) vers `to` depuis `from`. */
function greedyDirectionToward(from, to) {
  const dCol = to.col - from.col;
  const dRow = to.row - from.row;
  if (dCol === 0 && dRow === 0) return null;
  if (Math.abs(dCol) >= Math.abs(dRow)) return dCol > 0 ? 'right' : 'left';
  return dRow > 0 ? 'down' : 'up';
}

function nearestUnrevealedTarget(state) {
  const { cols, rows, revealed, character } = state;
  let best = null;
  let bestDist = Infinity;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (revealed[row * cols + col]) continue;
      const dist = Math.abs(col - character.pos.col) + Math.abs(row - character.pos.row);
      if (dist < bestDist) {
        bestDist = dist;
        best = { col, row };
      }
    }
  }
  return best;
}

/** Cible le centre du bloc (grille partitionnée en blocs ~carrés) contenant le plus de cases non découvertes. */
function densestUnrevealedTarget(state) {
  const { cols, rows, revealed, character } = state;
  const BLOCK = Math.max(3, Math.round(Math.min(cols, rows) / 6));
  const blockCols = Math.ceil(cols / BLOCK);
  const blockRows = Math.ceil(rows / BLOCK);
  const counts = new Array(blockCols * blockRows).fill(0);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (revealed[row * cols + col]) continue;
      const bCol = Math.floor(col / BLOCK);
      const bRow = Math.floor(row / BLOCK);
      counts[bRow * blockCols + bCol]++;
    }
  }

  let bestBlock = -1;
  let bestCount = 0;
  let bestDistToChar = Infinity;
  for (let b = 0; b < counts.length; b++) {
    if (counts[b] === 0) continue;
    const bRow = Math.floor(b / blockCols);
    const bCol = b % blockCols;
    const centerCol = Math.min(cols - 1, Math.round(bCol * BLOCK + BLOCK / 2));
    const centerRow = Math.min(rows - 1, Math.round(bRow * BLOCK + BLOCK / 2));
    const distToChar = Math.abs(centerCol - character.pos.col) + Math.abs(centerRow - character.pos.row);
    if (counts[b] > bestCount || (counts[b] === bestCount && distToChar < bestDistToChar)) {
      bestBlock = b;
      bestCount = counts[b];
      bestDistToChar = distToChar;
    }
  }
  if (bestBlock === -1) return null;
  const bRow = Math.floor(bestBlock / blockCols);
  const bCol = bestBlock % blockCols;
  return {
    col: Math.min(cols - 1, Math.round(bCol * BLOCK + BLOCK / 2)),
    row: Math.min(rows - 1, Math.round(bRow * BLOCK + BLOCK / 2)),
  };
}

function computeBestDirection(state) {
  if (!state || state.phase !== 'running') return null;
  const target =
    BOT_STRATEGY === 'nearest' ? nearestUnrevealedTarget(state) :
    BOT_STRATEGY === 'density' ? densestUnrevealedTarget(state) :
    null;
  if (!target) return null;
  return greedyDirectionToward(state.character.pos, target);
}

/**
 * Connecteur d'observation dédié (rôle `screen`, ne consomme pas de "place
 * joueur", ne nécessite aucune authentification) : suit l'état réel de la
 * partie — y compris les changements faits en direct depuis l'admin pendant
 * le test (grille, relance, pilotage à chaud) — et republie la direction
 * visée en continu. Tous les joueurs simulés lisent la même valeur —
 * cohérent avec le fait qu'il n'existe qu'un seul personnage, contrôlé
 * collectivement.
 */
function startObserver() {
  const state = { current: null };
  let sharedDirection = null;

  const socket = io(SERVER_URL, { transports: ['websocket'], reconnection: true });
  socket.on('connect', () => socket.emit('hello', { role: 'screen' }));
  socket.on('hello_ack', (payload) => {
    state.current = payload.snapshot.state;
    sharedDirection = computeBestDirection(state.current);
  });
  socket.on('snapshot', (snapshot) => {
    // Émis notamment après un Réinitialiser fait depuis l'admin pendant le test.
    state.current = snapshot.state;
    sharedDirection = computeBestDirection(state.current);
  });
  socket.on('state_delta', (delta) => {
    if (!state.current) return;
    const next = { ...state.current };
    if (delta.phase !== undefined) next.phase = delta.phase;
    if (delta.character !== undefined) next.character = delta.character;
    if (delta.revealedChanges) {
      const revealed = [...next.revealed];
      for (const change of delta.revealedChanges) revealed[change.index] = change.revealed;
      next.revealed = revealed;
    }
    state.current = next;
    sharedDirection = computeBestDirection(state.current);
  });

  return {
    getDirection: () => sharedDirection,
    getState: () => state.current,
    stop: () => socket.disconnect(),
  };
}

// ---------- Joueurs simulés ----------

function createPlayer(index, observer) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, { transports: ['websocket'], reconnection: true });
    const stats = { latencies: [], disconnects: 0, connectErrors: 0, inputsSent: 0 };
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
          index,
          socket,
          stats,
          sendInput() {
            lastInputAt = Date.now();
            stats.inputsSent++;
            const smart = observer?.getDirection();
            const direction = smart ?? DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            socket.emit('input', { direction });
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
      if (!shuttingDown) stats.disconnects++;
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

function summarize(players) {
  const allLatencies = players.flatMap((p) => p.stats.latencies).sort((a, b) => a - b);
  const totalInputs = players.reduce((sum, p) => sum + p.stats.inputsSent, 0);
  const totalDisconnects = players.reduce((sum, p) => sum + p.stats.disconnects, 0);
  const totalConnectErrors = players.reduce((sum, p) => sum + p.stats.connectErrors, 0);
  return {
    strategy: BOT_STRATEGY,
    playerCount: players.length,
    totalInputsSent: totalInputs,
    totalLatencySamples: allLatencies.length,
    latencyMsP50: percentile(allLatencies, 50),
    latencyMsP95: percentile(allLatencies, 95),
    latencyMsP99: percentile(allLatencies, 99),
    latencyMsMax: allLatencies.length > 0 ? allLatencies[allLatencies.length - 1] : null,
    unexpectedDisconnects: totalDisconnects,
    connectErrors: totalConnectErrors,
  };
}

async function main() {
  console.log(`Cible : ${SERVER_URL}`);
  console.log(`Stratégie des joueurs simulés : ${BOT_STRATEGY}`);
  console.log(
    "Aucune route admin ne sera appelée par ce script — configure/lance/pilote la partie toi-même depuis /admin, à tout moment, y compris pendant le test.",
  );

  const observer = BOT_STRATEGY === 'random' ? null : startObserver();
  if (observer) {
    // Laisse le temps au premier snapshot d'arriver.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Connexion de ${PLAYER_COUNT} joueurs simulés...`);
  const players = await Promise.all(Array.from({ length: PLAYER_COUNT }, (_, i) => createPlayer(i, observer)));
  console.log(`${players.length} joueurs connectés et rejoints. Envoi d'inputs (Ctrl+C pour arrêter à tout moment)...`);

  const intervals = players.map((player) => setInterval(player.sendInput, INPUT_INTERVAL_MS));

  const statsTimer = setInterval(() => {
    const s = observer?.getState();
    const revealedPct = s ? ((s.revealed.filter(Boolean).length / s.revealed.length) * 100).toFixed(1) : null;
    const summary = summarize(players);
    console.log(
      `[+${Math.round(process.uptime())}s] phase=${s?.phase ?? '?'}` +
        (revealedPct !== null ? ` revealed=${revealedPct}%` : '') +
        ` inputs=${summary.totalInputsSent} latenceP95=${summary.latencyMsP95 ?? '-'}ms` +
        ` déco=${summary.unexpectedDisconnects} erreurs=${summary.connectErrors}`,
    );
  }, STATS_INTERVAL_MS);

  let stopping = false;
  function shutdown(label) {
    if (stopping) return;
    stopping = true;
    shuttingDown = true;
    console.log(`\n${label} — arrêt en cours...`);
    clearInterval(statsTimer);
    for (const interval of intervals) clearInterval(interval);
    for (const player of players) player.socket.disconnect();
    observer?.stop();

    console.log(JSON.stringify(summarize(players), null, 2));
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('Interrompu (Ctrl+C)'));
  process.on('SIGTERM', () => shutdown('Signal reçu'));

  if (DURATION_MS !== null) {
    setTimeout(() => shutdown(`Durée de ${DURATION_MS / 1000}s écoulée`), DURATION_MS);
  }
  // Sans DURATION_MS : le process reste actif indéfiniment (les setInterval le
  // maintiennent en vie) jusqu'à Ctrl+C.
}

main().catch((err) => {
  console.error('Test de charge en échec :', err);
  process.exitCode = 1;
});
