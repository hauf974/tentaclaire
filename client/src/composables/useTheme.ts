import { computed, onUnmounted, watch, type ComputedRef, type Ref } from 'vue';
import type { PublicConfig } from '@tentaclaire/shared';
import { DEFAULT_THEME_ID, THEMES } from '../themes/registry.js';
import type { ThemeManifest } from '../themes/types.js';

/**
 * Applique la classe `theme-<id>` sur `<html>` d'après `config.theme` (champ
 * C6-immédiat, déjà diffusé à chaud via `config_changed` — Lot 5) et expose
 * le manifest actif pour le renderer canvas. À appeler depuis `ScreenView`/
 * `PlayView` uniquement : le dashboard admin reste non thématisé.
 */
export function useTheme(config: Ref<PublicConfig | null>): { manifest: ComputedRef<ThemeManifest> } {
  const manifest = computed(() => THEMES[config.value?.theme ?? DEFAULT_THEME_ID]);

  watch(
    manifest,
    (current) => {
      document.documentElement.className = `theme-${current.id}`;
    },
    { immediate: true },
  );

  onUnmounted(() => {
    document.documentElement.className = '';
  });

  return { manifest };
}
