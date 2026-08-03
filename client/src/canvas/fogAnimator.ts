const FADE_MS = 300;

export interface FogAnimator {
  /** Fixe l'état révélé immédiatement, sans fondu (snapshot initial, reset). */
  setInitial(revealed: boolean[]): void;
  /** Fixe les cibles à atteindre par fondu (~300 ms) au fil des `tick()`. */
  setRevealed(revealed: boolean[]): void;
  /** Avance l'animation de `elapsedMs`. */
  tick(elapsedMs: number): void;
  /** Alpha courant de la case (0 = révélée, 1 = masquée). */
  getAlpha(index: number): number;
}

/** Anime un canal alpha indépendant par case pour le fondu de révélation/masquage (~300 ms). */
export function createFogAnimator(): FogAnimator {
  let alpha = new Float32Array(0);
  let target = new Float32Array(0);

  function ensureSize(cellCount: number): void {
    if (alpha.length === cellCount) return;
    alpha = new Float32Array(cellCount).fill(1);
    target = new Float32Array(cellCount).fill(1);
  }

  return {
    setInitial(revealed) {
      ensureSize(revealed.length);
      for (let i = 0; i < revealed.length; i++) {
        target[i] = revealed[i] ? 0 : 1;
        alpha[i] = target[i];
      }
    },

    setRevealed(revealed) {
      ensureSize(revealed.length);
      for (let i = 0; i < revealed.length; i++) {
        target[i] = revealed[i] ? 0 : 1;
      }
    },

    tick(elapsedMs) {
      if (elapsedMs <= 0) return;
      const step = elapsedMs / FADE_MS;
      for (let i = 0; i < alpha.length; i++) {
        if (alpha[i] < target[i]) alpha[i] = Math.min(target[i], alpha[i] + step);
        else if (alpha[i] > target[i]) alpha[i] = Math.max(target[i], alpha[i] - step);
      }
    },

    getAlpha(index) {
      return alpha[index] ?? 1;
    },
  };
}
