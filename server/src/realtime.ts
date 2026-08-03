import type { GameState, StateDeltaPayload } from '@tentaclaire/shared';

/**
 * `game.getState()` renvoie une référence interne live (décision du Lot 1) :
 * elle continue de muter à chaque tick suivant. Pour comparer deux instants
 * distincts, il faut un vrai instantané indépendant — sinon `prev` et `curr`
 * finissent par pointer sur le même objet et plus aucun delta n'est détecté.
 */
export function cloneGameState(state: GameState): GameState {
  return {
    phase: state.phase,
    cols: state.cols,
    rows: state.rows,
    revealed: [...state.revealed],
    character: {
      pos: { ...state.character.pos },
      invincibleUntil: state.character.invincibleUntil,
      facing: state.character.facing,
    },
    ghosts: state.ghosts.map((ghost) => ({
      id: ghost.id,
      pos: { ...ghost.pos },
      target: ghost.target ? { ...ghost.target } : null,
      moveProgress: ghost.moveProgress,
    })),
    timerRemainingMs: state.timerRemainingMs,
    playerCount: state.playerCount,
    cooldownRemainingMs: state.cooldownRemainingMs,
  };
}

/**
 * Construit le delta d'état à diffuser en comparant `curr` au dernier état
 * diffusé (`prev`, `null` s'il n'y a jamais eu de diffusion). Ne renvoie que
 * les champs qui ont réellement changé ; `null` si rien n'a changé (aucun
 * `state_delta` ne doit être émis dans ce cas).
 */
export function computeStateDelta(prev: GameState | null, curr: GameState): StateDeltaPayload | null {
  const delta: StateDeltaPayload = {};

  if (prev === null || prev.phase !== curr.phase) {
    delta.phase = curr.phase;
  }
  if (prev === null || JSON.stringify(prev.character) !== JSON.stringify(curr.character)) {
    delta.character = curr.character;
  }
  if (prev === null || JSON.stringify(prev.ghosts) !== JSON.stringify(curr.ghosts)) {
    delta.ghosts = curr.ghosts;
  }
  if (prev === null || prev.timerRemainingMs !== curr.timerRemainingMs) {
    delta.timerRemainingMs = curr.timerRemainingMs;
  }
  if (prev === null || prev.playerCount !== curr.playerCount) {
    delta.playerCount = curr.playerCount;
  }
  if (prev === null || prev.cooldownRemainingMs !== curr.cooldownRemainingMs) {
    delta.cooldownRemainingMs = curr.cooldownRemainingMs;
  }

  const revealedChanges: { index: number; revealed: boolean }[] = [];
  for (let index = 0; index < curr.revealed.length; index++) {
    if (prev === null || prev.revealed[index] !== curr.revealed[index]) {
      revealedChanges.push({ index, revealed: curr.revealed[index] });
    }
  }
  if (revealedChanges.length > 0) {
    delta.revealedChanges = revealedChanges;
  }

  return Object.keys(delta).length > 0 ? delta : null;
}
