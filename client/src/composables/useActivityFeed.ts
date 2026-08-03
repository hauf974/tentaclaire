import type { Direction, FeedEntry, GameEventPayload, GamePhase } from '@tentaclaire/shared';
import type { Socket } from 'socket.io-client';
import { computed, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue';

export interface FeedDisplayEntry {
  id: string;
  kind: 'player' | 'system';
  pseudo?: string;
  direction?: Direction;
  message?: string;
  at: number;
}

const FEED_MAX = 50;

// Libellés du D1 : « Partie lancée ! », « Pause », « Le personnage a été
// attrapé ! », « Victoire ! », « Trop tard ! ». `resumed` (reprise après
// pause) réutilise « Partie lancée ! », aucun libellé distinct n'étant prévu.
const GAME_EVENT_MESSAGES: Partial<Record<string, string>> = {
  paused: 'Pause',
  resumed: 'Partie lancée !',
  victory: 'Victoire !',
  defeat: 'Trop tard !',
  character_died: 'Le personnage a été attrapé !',
};

/**
 * Fusionne le feed serveur (`feed_add`) avec des entrées système générées
 * côté client : les `game_event` couvrent pause/reprise/victoire/défaite/mort,
 * mais le tout premier lancement (`reset -> running`) n'a pas de marqueur
 * serveur dédié (ticket 1.2) — détecté ici par surveillance de la phase.
 */
export function useActivityFeed(
  socket: Socket,
  feed: Ref<FeedEntry[]>,
  phase: ComputedRef<GamePhase | undefined>,
): ComputedRef<FeedDisplayEntry[]> {
  const systemEntries = ref<FeedDisplayEntry[]>([]);
  let nextSystemId = 0;
  let lastPhase: GamePhase | null = null;

  function pushSystem(message: string): void {
    const entry: FeedDisplayEntry = { id: `sys-${nextSystemId++}`, kind: 'system', message, at: Date.now() };
    systemEntries.value = [...systemEntries.value, entry].slice(-FEED_MAX);
  }

  function onGameEvent(payload: GameEventPayload): void {
    const message = GAME_EVENT_MESSAGES[payload.type];
    if (message) pushSystem(message);
  }
  socket.on('game_event', onGameEvent);
  onUnmounted(() => {
    socket.off('game_event', onGameEvent);
  });

  watch(phase, (current) => {
    if (current && lastPhase === 'reset' && current === 'running') {
      pushSystem('Partie lancée !');
    }
    lastPhase = current ?? null;
  });

  return computed(() => {
    const playerEntries: FeedDisplayEntry[] = feed.value.map((entry) => ({
      id: `player-${entry.id}`,
      kind: 'player',
      pseudo: entry.pseudo,
      direction: entry.direction,
      at: entry.at,
    }));
    return [...playerEntries, ...systemEntries.value].sort((a, b) => a.at - b.at).slice(-FEED_MAX);
  });
}
