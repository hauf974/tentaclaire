import type {
  Direction,
  FeedEntry,
  GamePhase,
  GameState,
  PublicConfig,
} from './types.js';

export type ClientRole = 'player' | 'screen' | 'admin';

// ---------- Connexion et identification ----------

export interface HelloPayload {
  role: ClientRole;
  token?: string; // UUID LocalStorage s'il existe (role 'player')
}

export interface FullSnapshot {
  config: PublicConfig;
  state: GameState;
  activeImageUrl: string | null;
  feed: FeedEntry[]; // 50 dernières entrées
}

export interface HelloAckPayload {
  ok: true;
  session?: { token: string; pseudo: string } | null; // null si token inconnu/expiré (rôle player)
  snapshot: FullSnapshot;
}

// ---------- Cycle joueur ----------

export interface JoinPayload {
  pseudo: string; // 1..20 caractères, trim, rejet si vide
}

export interface JoinAckPayload {
  token: string;
  pseudo: string; // pseudo éventuellement suffixé : Alex -> Alex_1 (J16)
}

export interface InputPayload {
  direction: Direction;
}

// ---------- Diffusion d'état (serveur -> tous) ----------

export interface StateDeltaPayload {
  phase?: GamePhase;
  character?: GameState['character'];
  ghosts?: GameState['ghosts']; // positions + progress pour interpolation
  revealedChanges?: { index: number; revealed: boolean }[]; // cases modifiées uniquement
  timerRemainingMs?: number;
  playerCount?: number;
  cooldownRemainingMs?: number;
}

export interface FeedAddPayload {
  entry: FeedEntry;
}

export type GameEventType =
  | 'victory'
  | 'defeat'
  | 'paused'
  | 'resumed'
  | 'reset'
  | 'character_died';

export interface GameEventPayload {
  type: GameEventType;
}

export interface ConfigChangedPayload {
  config: PublicConfig;
}

// ---------- Contrat Socket.IO typé ----------

export interface ClientToServerEvents {
  hello: (payload: HelloPayload) => void;
  join: (payload: JoinPayload) => void;
  input: (payload: InputPayload) => void;
}

export interface ServerToClientEvents {
  hello_ack: (payload: HelloAckPayload) => void;
  join_ack: (payload: JoinAckPayload) => void;
  snapshot: (payload: FullSnapshot) => void;
  state_delta: (payload: StateDeltaPayload) => void;
  feed_add: (payload: FeedAddPayload) => void;
  game_event: (payload: GameEventPayload) => void;
  config_changed: (payload: ConfigChangedPayload) => void;
}
