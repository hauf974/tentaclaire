import type { GameState, StateDeltaPayload } from '@tentaclaire/shared';

/**
 * Applique un `state_delta` reçu du serveur à l'état courant, sans le muter.
 * `revealedChanges` n'est pas un champ direct de `GameState` (c'est une liste
 * d'index modifiés) : il faut copier `revealed` et écrire chaque changement.
 */
export function applyStateDelta(current: GameState, delta: StateDeltaPayload): GameState {
  const next: GameState = { ...current };

  if (delta.phase !== undefined) next.phase = delta.phase;
  if (delta.character !== undefined) next.character = delta.character;
  if (delta.ghosts !== undefined) next.ghosts = delta.ghosts;
  if (delta.timerRemainingMs !== undefined) next.timerRemainingMs = delta.timerRemainingMs;
  if (delta.playerCount !== undefined) next.playerCount = delta.playerCount;
  if (delta.cooldownRemainingMs !== undefined) next.cooldownRemainingMs = delta.cooldownRemainingMs;

  if (delta.revealedChanges) {
    const revealed = [...current.revealed];
    for (const change of delta.revealedChanges) {
      revealed[change.index] = change.revealed;
    }
    next.revealed = revealed;
  }

  return next;
}
