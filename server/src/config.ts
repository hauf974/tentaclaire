import type {
  CollisionMode,
  GameConfig,
  GhostBehavior,
  MovementMode,
  PublicConfig,
  StartPosition,
  ThemeId,
} from '@tentaclaire/shared';
import { defaultGameConfig } from '@tentaclaire/shared';

const THEMES: readonly ThemeId[] = ['maraudeur', 'manoir', 'halloween', 'cimetiere', 'neon'];
const MOVEMENT_MODES: readonly MovementMode[] = ['chaos', 'democratie'];
const GHOST_BEHAVIORS: readonly GhostBehavior[] = ['aleatoire', 'traque', 'extinction'];
const COLLISION_MODES: readonly CollisionMode[] = ['passif', 'mortel_reapparition', 'mortel_reinitialisation'];
const START_POSITIONS: readonly StartPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'random',
];

/** Champs appliqués immédiatement (C6) ; les autres attendent le prochain reset/launch. */
const IMMEDIATE_FIELDS: readonly (keyof GameConfig)[] = ['theme', 'showGridOnFog', 'showGridOnRevealed', 'qrUrl'];

type Validator = (value: unknown) => boolean;

function inRange(min: number, max: number): Validator {
  return (value) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function oneOf(values: readonly string[]): Validator {
  return (value) => typeof value === 'string' && (values as string[]).includes(value);
}
function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean';
}
function isString(value: unknown): boolean {
  return typeof value === 'string';
}

const VALIDATORS: Partial<Record<keyof GameConfig, Validator>> = {
  qrUrl: isString,
  gridAuto: isBoolean,
  gridCols: inRange(5, 50),
  gridRows: inRange(5, 50),
  showGridOnFog: isBoolean,
  showGridOnRevealed: isBoolean,
  startPosition: oneOf(START_POSITIONS),
  timerSeconds: inRange(10, 3600),
  movementMode: oneOf(MOVEMENT_MODES),
  chaosCooldownMs: inRange(100, 5000),
  democracyWindowMs: inRange(100, 5000),
  torchRadius: (value) => value === 0 || value === 1 || value === 2,
  ghostCount: inRange(0, 20),
  ghostSpeed: inRange(0.5, 5),
  ghostBehavior: oneOf(GHOST_BEHAVIORS),
  collisionMode: oneOf(COLLISION_MODES),
  theme: oneOf(THEMES),
};

export interface ConfigUpdateResult {
  ok: boolean;
  errors: string[];
  /** true si au moins un champ C6-immédiat a changé (déclenche `config_changed`). */
  immediateChange: boolean;
}

export interface ConfigStore {
  get(): GameConfig;
  /** Valide puis applique `patch` atomiquement (tout ou rien). `activeImageId` est ignoré : géré par les routes /images (ticket 2.5). */
  update(patch: Record<string, unknown>): ConfigUpdateResult;
  /** Réservé aux routes /images (galerie) : `activeImageId` n'est pas exposé via `update()`. */
  setActiveImage(imageId: string | null): void;
}

export function createConfigStore(initial: GameConfig = defaultGameConfig): ConfigStore {
  let config: GameConfig = { ...initial };

  return {
    get() {
      return config;
    },

    update(patch) {
      const errors: string[] = [];
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'activeImageId') continue;
        const validator = VALIDATORS[key as keyof GameConfig];
        if (!validator) {
          errors.push(`champ inconnu : ${key}`);
        } else if (!validator(value)) {
          errors.push(`valeur invalide pour ${key}`);
        }
      }
      if (errors.length > 0) return { ok: false, errors, immediateChange: false };

      let immediateChange = false;
      const next = { ...config };
      for (const [key, value] of Object.entries(patch)) {
        if (key === 'activeImageId') continue;
        (next as Record<string, unknown>)[key] = value;
        if (IMMEDIATE_FIELDS.includes(key as keyof GameConfig)) immediateChange = true;
      }
      config = next;

      return { ok: true, errors: [], immediateChange };
    },

    setActiveImage(imageId) {
      config = { ...config, activeImageId: imageId };
    },
  };
}

export function toPublicConfig(config: GameConfig): PublicConfig {
  return {
    qrUrl: config.qrUrl,
    gridCols: config.gridCols,
    gridRows: config.gridRows,
    showGridOnFog: config.showGridOnFog,
    showGridOnRevealed: config.showGridOnRevealed,
    movementMode: config.movementMode,
    chaosCooldownMs: config.chaosCooldownMs,
    democracyWindowMs: config.democracyWindowMs,
    torchRadius: config.torchRadius,
    theme: config.theme,
  };
}
