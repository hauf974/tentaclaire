import type {
  ClientRole,
  ConfigChangedPayload,
  Direction,
  FeedAddPayload,
  FeedEntry,
  FullSnapshot,
  GameState,
  HelloAckPayload,
  JoinAckPayload,
  PublicConfig,
  StateDeltaPayload,
} from '@tentaclaire/shared';
import { io, type Socket } from 'socket.io-client';
import { ref, type Ref } from 'vue';

import { applyStateDelta } from '../canvas/applyStateDelta.js';

const FEED_MAX = 50;
export const TOKEN_STORAGE_KEY = 'tentaclaire_token';

export interface UseSocketResult {
  socket: Socket;
  connected: Ref<boolean>;
  /** Vrai entre une déconnexion et la reconnexion suivante (bandeau « Reconnexion… »). */
  reconnecting: Ref<boolean>;
  /** Vrai après le premier `hello_ack`/`snapshot` reçu (distingue « connexion en cours » de « connecté, sans session »). */
  ready: Ref<boolean>;
  state: Ref<GameState | null>;
  config: Ref<PublicConfig | null>;
  activeImageUrl: Ref<string | null>;
  feed: Ref<FeedEntry[]>;
  session: Ref<{ token: string; pseudo: string } | null>;
  /** Rôle `player` uniquement : demande à rejoindre la partie avec ce pseudo. */
  join(pseudo: string): void;
  /** Rôle `player` uniquement : envoie une direction. */
  sendInput(direction: Direction): void;
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
  const ready = ref(false);
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
    socket.emit('hello', { role, token: session.value?.token ?? token });
  });

  socket.on('disconnect', () => {
    connected.value = false;
    reconnecting.value = true;
  });

  socket.on('hello_ack', (payload: HelloAckPayload) => {
    ready.value = true;
    session.value = payload.session ?? null;
    applySnapshot(payload.snapshot);
  });

  socket.on('snapshot', (snapshot: FullSnapshot) => {
    ready.value = true;
    applySnapshot(snapshot);
  });

  socket.on('join_ack', (payload: JoinAckPayload) => {
    session.value = { token: payload.token, pseudo: payload.pseudo };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
    }
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

  function join(pseudo: string): void {
    socket.emit('join', { pseudo });
  }

  function sendInput(direction: Direction): void {
    socket.emit('input', { direction });
  }

  return {
    socket,
    connected,
    reconnecting,
    ready,
    state,
    config,
    activeImageUrl,
    feed,
    session,
    join,
    sendInput,
  };
}
