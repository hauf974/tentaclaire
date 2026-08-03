import type {
  ClientRole,
  ConfigChangedPayload,
  FeedAddPayload,
  FeedEntry,
  FullSnapshot,
  GameState,
  HelloAckPayload,
  PublicConfig,
  StateDeltaPayload,
} from '@tentaclaire/shared';
import { io, type Socket } from 'socket.io-client';
import { ref, type Ref } from 'vue';

import { applyStateDelta } from '../canvas/applyStateDelta.js';

const FEED_MAX = 50;

export interface UseSocketResult {
  socket: Socket;
  connected: Ref<boolean>;
  /** Vrai entre une déconnexion et la reconnexion suivante (bandeau « Reconnexion… »). */
  reconnecting: Ref<boolean>;
  state: Ref<GameState | null>;
  config: Ref<PublicConfig | null>;
  activeImageUrl: Ref<string | null>;
  feed: Ref<FeedEntry[]>;
  session: Ref<{ token: string; pseudo: string } | null>;
}

/**
 * Connexion Socket.IO same-origin (URLs relatives, décision T8). Envoie
 * `hello` à chaque connexion/reconnexion et applique snapshot/deltas. Une
 * reconnexion redemande un snapshot complet (resynchronisation), jamais un
 * delta partiel sur un état inconnu.
 */
export function useSocket(role: ClientRole, token?: string): UseSocketResult {
  const socket: Socket = io({ transports: ['websocket', 'polling'] });

  const connected = ref(false);
  const reconnecting = ref(false);
  const state = ref<GameState | null>(null);
  const config = ref<PublicConfig | null>(null);
  const activeImageUrl = ref<string | null>(null);
  const feed = ref<FeedEntry[]>([]);
  const session = ref<{ token: string; pseudo: string } | null>(null);

  function applySnapshot(snapshot: FullSnapshot): void {
    state.value = snapshot.state;
    config.value = snapshot.config;
    activeImageUrl.value = snapshot.activeImageUrl;
    feed.value = snapshot.feed.slice(-FEED_MAX);
  }

  socket.on('connect', () => {
    connected.value = true;
    reconnecting.value = false;
    socket.emit('hello', { role, token });
  });

  socket.on('disconnect', () => {
    connected.value = false;
    reconnecting.value = true;
  });

  socket.on('hello_ack', (payload: HelloAckPayload) => {
    session.value = payload.session ?? null;
    applySnapshot(payload.snapshot);
  });

  socket.on('snapshot', (snapshot: FullSnapshot) => {
    applySnapshot(snapshot);
  });

  socket.on('state_delta', (delta: StateDeltaPayload) => {
    if (state.value) state.value = applyStateDelta(state.value, delta);
  });

  socket.on('feed_add', (payload: FeedAddPayload) => {
    feed.value = [...feed.value, payload.entry].slice(-FEED_MAX);
  });

  socket.on('config_changed', (payload: ConfigChangedPayload) => {
    config.value = payload.config;
  });

  return { socket, connected, reconnecting, state, config, activeImageUrl, feed, session };
}
