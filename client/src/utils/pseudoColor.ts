/** Couleur HSL stable dérivée d'un hash simple du pseudo (D1) — toujours la même couleur pour un pseudo donné. */
export function pseudoColor(pseudo: string): string {
  let hash = 0;
  for (let i = 0; i < pseudo.length; i++) {
    hash = (hash * 31 + pseudo.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 65%)`;
}
