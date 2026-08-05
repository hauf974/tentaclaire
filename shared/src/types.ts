// ---------- Configuration (modifiable via l'admin) ----------

export type MovementMode = 'chaos' | 'democratie';
export type GhostBehavior = 'aleatoire' | 'traque' | 'extinction';
export type CollisionMode = 'passif' | 'mortel_reapparition' | 'mortel_reinitialisation';
export type ThemeId = 'maraudeur' | 'manoir' | 'halloween' | 'cimetiere' | 'neon';
export type StartPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'random';

export interface GameConfig {
  // Réseau
  qrUrl: string; // URL encodée dans le QR Code

  // Plateau
  activeImageId: string | null; // image sélectionnée dans la galerie
  gridAuto: boolean; // true : lignes calculées d'après le ratio image
  gridCols: number; // 5..50
  gridRows: number; // 5..50 (ignoré si gridAuto)
  showGridOnFog: boolean;
  showGridOnRevealed: boolean;
  startPosition: StartPosition; // défaut 'bottom-center' (R3), appliqué au prochain lancement

  // Partie
  timerSeconds: number; // durée du compte à rebours (défaut 300)

  // Déplacements
  movementMode: MovementMode; // défaut 'chaos'
  chaosCooldownMs: number; // défaut 500
  democracyWindowMs: number; // défaut 300
  torchRadius: 0 | 1 | 2; // 0 = case seule (défaut), 1 = 3x3, 2 = 5x5

  // Fantômes
  ghostCount: number; // 0..20 (défaut 3)
  ghostSpeed: number; // cases/seconde (0.5..5, défaut 1)
  ghostBehavior: GhostBehavior; // défaut 'aleatoire'
  collisionMode: CollisionMode; // défaut 'passif'

  // Thème
  theme: ThemeId; // défaut 'maraudeur'
}

/** Sous-ensemble de GameConfig diffusé aux clients (écran, manette). */
export type PublicConfig = Pick<
  GameConfig,
  | 'qrUrl'
  | 'gridCols'
  | 'gridRows'
  | 'showGridOnFog'
  | 'showGridOnRevealed'
  | 'movementMode'
  | 'chaosCooldownMs'
  | 'democracyWindowMs'
  | 'torchRadius'
  | 'theme'
>;

// ---------- État de la partie (autorité serveur) ----------

export type GamePhase = 'idle' | 'reset' | 'running' | 'paused' | 'victory' | 'defeat';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  col: number;
  row: number;
}

export interface CharacterState {
  pos: Position;
  invincibleUntil: number | null; // timestamp serveur, null si non invincible
  facing: Direction; // pour l'orientation du sprite
}

export interface GhostState {
  id: number;
  pos: Position; // case logique courante
  target: Position | null; // case de destination (pour interpolation client)
  moveProgress: number; // 0..1, progression vers target
}

export interface GameState {
  phase: GamePhase;
  cols: number;
  rows: number;
  revealed: boolean[]; // cols x rows, index = row * cols + col
  character: CharacterState;
  ghosts: GhostState[];
  timerRemainingMs: number;
  playerCount: number;
  cooldownRemainingMs: number; // mode chaos uniquement, 0 sinon
}

// ---------- Joueurs et sessions ----------

export interface PlayerSession {
  token: string; // UUID, stocké côté client en LocalStorage
  pseudo: string; // unique, suffixé si doublon (Alex_1)
  createdAt: number; // expiration : createdAt + 8 h
  lastSeenAt: number; // retrait du compteur après 5 min sans WS
  connected: boolean;
}

// ---------- Galerie d'images ----------

export interface GalleryImage {
  id: string;
  filename: string; // nom sur disque
  originalName: string;
  width: number;
  height: number; // ratio utilisé pour le calcul gridAuto
  uploadedAt: number;
}

// ---------- Feed d'activité ----------

export interface FeedEntry {
  id: number;
  pseudo: string;
  direction: Direction; // rendu client : « Alex_1 a appuyé sur ⬆️ »
  at: number;
}
