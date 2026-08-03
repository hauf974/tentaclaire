import { onMounted, onUnmounted } from 'vue';

/** Bascule plein écran au clic (à appeler depuis un handler) ou à la touche F. */
export function useFullscreen(): { toggle: () => void } {
  function toggle(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'f' || event.key === 'F') toggle();
  }

  onMounted(() => window.addEventListener('keydown', onKeydown));
  onUnmounted(() => window.removeEventListener('keydown', onKeydown));

  return { toggle };
}
