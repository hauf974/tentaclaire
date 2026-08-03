import type { GamePhase, GameState, PublicConfig } from '@tentaclaire/shared';
import { onMounted, onUnmounted, type Ref } from 'vue';

import { drawBoard } from '../canvas/boardRenderer.js';
import { createCharacterAnimator, isCharacterVisible, victoryBounceOffset } from '../canvas/characterAnimator.js';
import { createFogAnimator } from '../canvas/fogAnimator.js';
import { ghostFloatOffset, ghostVisualPosition } from '../canvas/ghostVisuals.js';

/**
 * Boucle de rendu du plateau : dimensionne le canvas en letterbox au ratio de
 * la grille (devicePixelRatio inclus), anime le brouillard et dessine chaque
 * frame via `requestAnimationFrame` — nécessaire même sans nouveau
 * `state_delta`, pour que les fondus restent fluides.
 */
export function useBoardCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  containerRef: Ref<HTMLElement | null>,
  state: Ref<GameState | null>,
  config: Ref<PublicConfig | null>,
  activeImageUrl: Ref<string | null>,
): void {
  const fog = createFogAnimator();
  const character = createCharacterAnimator();

  let lastCols = 0;
  let lastRows = 0;
  let lastPhase: GamePhase | null = null;
  let backgroundImage: HTMLImageElement | null = null;
  let loadedImageUrl: string | null = null;
  let rafId = 0;
  let lastFrameTime = 0;

  function resizeCanvas(): void {
    const canvas = canvasRef.value;
    const container = containerRef.value;
    const s = state.value;
    if (!canvas || !container || !s) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const gridRatio = s.cols / s.rows;

    let cssWidth = rect.width;
    let cssHeight = cssWidth / gridRatio;
    if (cssHeight > rect.height) {
      cssHeight = rect.height;
      cssWidth = cssHeight * gridRatio;
    }

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  }

  function ensureBackgroundImage(): void {
    if (activeImageUrl.value === loadedImageUrl) return;
    loadedImageUrl = activeImageUrl.value;
    if (!activeImageUrl.value) {
      backgroundImage = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      backgroundImage = img;
    };
    img.src = activeImageUrl.value;
  }

  function frame(time: number): void {
    rafId = requestAnimationFrame(frame);

    const elapsed = lastFrameTime ? time - lastFrameTime : 0;
    lastFrameTime = time;

    const s = state.value;
    const canvas = canvasRef.value;
    if (!s || !canvas) return;

    ensureBackgroundImage();

    const gridChanged = s.cols !== lastCols || s.rows !== lastRows;
    const enteredReset = s.phase === 'reset' && lastPhase !== 'reset';
    if (gridChanged || enteredReset || lastPhase === null) {
      resizeCanvas();
      fog.setInitial(s.revealed);
    } else {
      fog.setRevealed(s.revealed);
    }
    lastCols = s.cols;
    lastRows = s.rows;
    lastPhase = s.phase;

    fog.tick(elapsed);
    character.setCharacter(s.character);
    character.tick(elapsed);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = Date.now();
    drawBoard(ctx, canvas.width, canvas.height, {
      cols: s.cols,
      rows: s.rows,
      fog,
      backgroundImage,
      showGridOnFog: config.value?.showGridOnFog ?? true,
      showGridOnRevealed: config.value?.showGridOnRevealed ?? true,
      character: {
        visualPos: character.getVisualPos(),
        facing: character.getFacing(),
        visible: isCharacterVisible(s.character.invincibleUntil, now),
        bounceOffset: s.phase === 'victory' ? victoryBounceOffset(now) : 0,
      },
      ghosts: s.ghosts.map((ghost) => ({
        visualPos: ghostVisualPosition(ghost, s.cols, s.rows),
        floatOffset: ghostFloatOffset(ghost.id, now),
      })),
    });
  }

  onMounted(() => {
    rafId = requestAnimationFrame(frame);
    window.addEventListener('resize', resizeCanvas);
  });

  onUnmounted(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resizeCanvas);
  });
}
