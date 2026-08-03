function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Nombre de lignes en mode grille automatique, calculé pour obtenir des
 * cases carrées d'après le ratio de l'image (G4). Partagé entre le serveur
 * (résolution à l'activation d'une image ou à un changement de colonnes) et
 * le client (aperçu en direct dans le dashboard admin).
 */
export function computeAutoGridRows(cols: number, imageWidth: number, imageHeight: number): number {
  return clamp(Math.round((cols * imageHeight) / imageWidth), 5, 50);
}
