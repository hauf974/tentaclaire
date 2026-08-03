import { onMounted, onUnmounted, ref, type Ref } from 'vue';

const DEFAULT_IDLE_MS = 3000;

/** Vrai après `idleMs` sans mouvement de souris — pour masquer le curseur (confort écran géant). */
export function useIdleCursor(idleMs: number = DEFAULT_IDLE_MS): Ref<boolean> {
  const idle = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset(): void {
    idle.value = false;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      idle.value = true;
    }, idleMs);
  }

  onMounted(() => {
    window.addEventListener('mousemove', reset);
    reset();
  });

  onUnmounted(() => {
    window.removeEventListener('mousemove', reset);
    if (timer) clearTimeout(timer);
  });

  return idle;
}
