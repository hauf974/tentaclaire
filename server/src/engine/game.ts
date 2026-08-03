import type { GameConfig, GameState } from '@tentaclaire/shared';

import type { EngineEvent } from './events.js';
import { cellIndex, createEmptyRevealed, setCells, startingPosition, torchCells } from './grid.js';

export interface GameEngine {
  /** Avance l'horloge du moteur ; `nowMs` est l'horodatage courant (injecté par l'appelant). */
  tick(nowMs: number): void;
  /** `reset|paused -> running`. Ignoré depuis toute autre phase. */
  launch(): void;
  /** `running -> paused`. Ignoré depuis toute autre phase. */
  pause(): void;
  /** Depuis n'importe quelle phase -> `reset`. Adopte `config` si fourni (C6). */
  reset(config?: GameConfig): void;
  /** État courant complet, prêt à être diffusé. Référence interne : ne pas muter. */
  getState(): GameState;
  /** Vide et renvoie le buffer d'événements accumulés depuis le dernier appel. */
  drainEvents(): EngineEvent[];
  /** Passthrough pur : le moteur ne gère pas les sessions, seulement le compteur affiché. */
  setPlayerCount(count: number): void;
}

export function createGame(
  initialConfig: GameConfig,
  rng: () => number,
  now: () => number,
): GameEngine {
  let config = initialConfig;
  const events: EngineEvent[] = [];
  let lastTickAt: number | null = null;

  const state: GameState = {
    phase: 'idle',
    cols: 0,
    rows: 0,
    revealed: [],
    character: { pos: { col: 0, row: 0 }, invincibleUntil: null, facing: 'down' },
    ghosts: [],
    timerRemainingMs: 0,
    playerCount: 0,
    cooldownRemainingMs: 0,
  };

  /**
   * (Ré)initialise le plateau d'après `config` : brouillard 100 %, personnage
   * au départ, timer plein. Renvoie les index révélés (toujours la zone de
   * départ entière, puisqu'on part d'une grille neuve).
   */
  function initializeBoard(): number[] {
    state.cols = config.gridCols;
    state.rows = config.gridRows;
    state.revealed = createEmptyRevealed(config.gridCols, config.gridRows);

    const start = startingPosition(config.gridCols, config.gridRows);
    state.character = { pos: start, invincibleUntil: null, facing: 'down' };

    const startIndices = torchCells(start, config.torchRadius, config.gridCols, config.gridRows).map(
      (p) => cellIndex(p.col, p.row, config.gridCols),
    );
    const changed = setCells(state.revealed, startIndices, true);

    state.timerRemainingMs = config.timerSeconds * 1000;
    state.cooldownRemainingMs = 0;
    state.ghosts = [];
    return changed;
  }

  // État initial `idle` (avant tout reset explicite) : plateau valide mais inerte,
  // aucun événement émis (ce n'est pas encore une "vraie" réinitialisation).
  initializeBoard();

  return {
    tick(nowMs: number): void {
      const elapsed = lastTickAt === null ? 0 : Math.max(0, nowMs - lastTickAt);
      lastTickAt = nowMs;

      if (state.phase !== 'running') return;

      state.timerRemainingMs = Math.max(0, state.timerRemainingMs - elapsed);
      if (state.timerRemainingMs === 0) {
        state.phase = 'defeat';
        const changes = setCells(
          state.revealed,
          state.revealed.map((_, index) => index),
          false,
        );
        if (changes.length > 0) {
          events.push({ type: 'revealed_changed', changes: changes.map((index) => ({ index, revealed: false })) });
        }
        events.push({ type: 'defeat' });
      }
    },

    launch(): void {
      if (state.phase === 'reset') {
        state.phase = 'running';
      } else if (state.phase === 'paused') {
        state.phase = 'running';
        events.push({ type: 'resumed' });
      }
    },

    pause(): void {
      if (state.phase !== 'running') return;
      state.phase = 'paused';
      events.push({ type: 'paused' });
    },

    reset(newConfig?: GameConfig): void {
      if (newConfig) config = newConfig;
      const changed = initializeBoard();
      state.phase = 'reset';
      if (changed.length > 0) {
        events.push({ type: 'revealed_changed', changes: changed.map((index) => ({ index, revealed: true })) });
      }
      events.push({ type: 'reset' });
    },

    getState(): GameState {
      return state;
    },

    drainEvents(): EngineEvent[] {
      const drained = events.splice(0, events.length);
      return drained;
    },

    setPlayerCount(count: number): void {
      state.playerCount = count;
    },
  };
}
