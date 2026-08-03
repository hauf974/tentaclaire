import type { GameConfig } from './types.js';

/**
 * Configuration par défaut au démarrage du serveur (T4 : aucune persistance,
 * un redémarrage repart toujours de ces valeurs).
 */
export const defaultGameConfig: GameConfig = {
  // Réseau
  qrUrl: '',

  // Plateau
  activeImageId: null,
  gridAuto: true,
  gridCols: 10,
  gridRows: 10,
  showGridOnFog: true,
  showGridOnRevealed: true,

  // Partie
  timerSeconds: 300,

  // Déplacements
  movementMode: 'chaos',
  chaosCooldownMs: 500,
  democracyWindowMs: 300,
  torchRadius: 0,

  // Fantômes
  ghostCount: 3,
  ghostSpeed: 1,
  ghostBehavior: 'aleatoire',
  collisionMode: 'passif',

  // Thème
  theme: 'maraudeur',
};
