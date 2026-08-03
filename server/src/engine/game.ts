import type { CharacterState, Direction, GameConfig, GameState, Position } from '@tentaclaire/shared';

import type { EngineEvent } from './events.js';
import { cellIndex, createEmptyRevealed, setCells, startingPosition, torchCells } from './grid.js';
import { applyDirection, resolveVoteWindow } from './movement.js';

function emptyVotes(): Record<Direction, number> {
  return { up: 0, down: 0, left: 0, right: 0 };
}

export interface GameEngine {
  /** Avance l'horloge du moteur ; `nowMs` est l'horodatage courant (injecté par l'appelant). */
  tick(nowMs: number): void;
  /** Entrée d'un joueur (`pseudo`, pour le feed). Ignorée si la partie n'est pas `running`. */
  handleInput(direction: Direction, pseudo: string): void;
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

function cloneCharacter(character: CharacterState): CharacterState {
  return { pos: { ...character.pos }, invincibleUntil: character.invincibleUntil, facing: character.facing };
}

export function createGame(
  initialConfig: GameConfig,
  rng: () => number,
  now: () => number,
): GameEngine {
  let config = initialConfig;
  const events: EngineEvent[] = [];
  let lastTickAt: number | null = null;
  let cooldownUntil = 0;
  let votes = emptyVotes();
  let voteWindowEndsAt = 0;

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
    cooldownUntil = 0;
    votes = emptyVotes();
    voteWindowEndsAt = 0;
    return changed;
  }

  /** Déplace le personnage vers `target`, révèle la zone de torche, émet les événements. */
  function moveCharacter(target: Position, direction: Direction): void {
    state.character.pos = target;
    state.character.facing = direction;

    const revealIndices = torchCells(target, config.torchRadius, state.cols, state.rows).map((p) =>
      cellIndex(p.col, p.row, state.cols),
    );
    const revealedChanges = setCells(state.revealed, revealIndices, true);

    events.push({ type: 'character_moved', character: cloneCharacter(state.character) });
    if (revealedChanges.length > 0) {
      events.push({
        type: 'revealed_changed',
        changes: revealedChanges.map((index) => ({ index, revealed: true })),
      });
    }
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
        return; // arrêt immédiat (J13) : rien d'autre n'avance ce tick
      }

      if (config.movementMode === 'democratie' && nowMs >= voteWindowEndsAt) {
        const winner = resolveVoteWindow(votes, rng);
        votes = emptyVotes();
        voteWindowEndsAt = nowMs + config.democracyWindowMs;

        if (winner !== null) {
          const target = applyDirection(state.character.pos, winner, state.cols, state.rows, false);
          if (target !== null) moveCharacter(target, winner);
          // sinon : direction gagnante vers un mur -> immobile ce tour-ci (Gameplay §1)
        }
      }
    },

    handleInput(direction: Direction, pseudo: string): void {
      if (state.phase !== 'running') return;

      if (config.movementMode === 'chaos') {
        if (now() < cooldownUntil) return; // cooldown actif : ignoré, ne consomme rien

        const target = applyDirection(state.character.pos, direction, state.cols, state.rows, false);
        if (target === null) return; // mur : ignoré, ne consomme pas le cooldown (Gameplay §1)

        cooldownUntil = now() + config.chaosCooldownMs;
        moveCharacter(target, direction);
        events.push({ type: 'input_accepted', pseudo, direction });
      } else {
        // Démocratie (J6) : chaque appui compte comme une voix, y compris vers un mur ;
        // la fenêtre n'est résolue que dans tick().
        votes[direction]++;
        events.push({ type: 'input_accepted', pseudo, direction });
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
      state.cooldownRemainingMs =
        config.movementMode === 'chaos' ? Math.max(0, cooldownUntil - now()) : 0;
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
