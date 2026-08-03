import type { CharacterState, Direction, GameEventType, GhostState } from '@tentaclaire/shared';

/**
 * Événements produits par le moteur depuis le dernier `drainEvents()`.
 * C'est ce que Lot 2 (sockets.ts) traduira en diffusion réseau
 * (state_delta, feed_add, game_event).
 */
export type EngineEvent =
  | { type: 'input_accepted'; pseudo: string; direction: Direction }
  | { type: 'character_moved'; character: CharacterState }
  | { type: 'ghost_moved'; ghost: GhostState }
  | { type: 'revealed_changed'; changes: { index: number; revealed: boolean }[] }
  | { type: GameEventType };
