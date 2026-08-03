import { ref, watch, type Ref } from 'vue';
import type { GameConfig, GamePhase } from '@tentaclaire/shared';
import { AdminApiError, getConfig, updateConfig } from './useAdminApi.js';

const SAVE_DEBOUNCE_MS = 400;
const SAVED_FLASH_MS = 1500;

/** Champs C6-immédiats (cf. server/src/config.ts) : appliqués tout de suite, jamais "en attente". */
const IMMEDIATE_FIELDS: ReadonlySet<keyof GameConfig> = new Set(['theme', 'showGridOnFog', 'showGridOnRevealed', 'qrUrl']);

export interface UseAdminConfigResult {
  config: Ref<GameConfig | null>;
  /** Vrai brièvement après un enregistrement réussi ("Enregistré ✓"). */
  saved: Ref<boolean>;
  /** Champs non-immédiats modifiés depuis le dernier reset/lancement ("Appliqué au prochain lancement"). */
  pendingFields: Ref<Set<keyof GameConfig>>;
  error: Ref<string | null>;
  /** Fusionne `fields` localement puis envoie un PUT débouncé. */
  patch(fields: Partial<GameConfig>): void;
  /** Charge (ou recharge) la config depuis le serveur — à appeler explicitement une fois authentifié. */
  load(): Promise<void>;
  /** Remplace la config locale par une valeur déjà à jour côté serveur (ex. après activation d'image, qui recalcule gridRows) — pas de PUT. */
  setConfig(next: GameConfig): void;
}

/**
 * Config admin complète (au-delà du sous-ensemble PublicConfig), avec
 * enregistrement débouncé et suivi des champs "en attente du prochain
 * lancement" (C6). `phase`, si fourni, vide ce suivi à chaque transition
 * vers `reset`/`running` (le changement vient d'être adopté par le moteur).
 */
export function useAdminConfig(phase?: Ref<GamePhase | undefined>): UseAdminConfigResult {
  const config = ref<GameConfig | null>(null) as Ref<GameConfig | null>;
  const saved = ref(false);
  const pendingFields = ref<Set<keyof GameConfig>>(new Set());
  const error = ref<string | null>(null);

  let accumulated: Partial<GameConfig> = {};
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let savedFlashTimer: ReturnType<typeof setTimeout> | undefined;

  async function load(): Promise<void> {
    try {
      config.value = await getConfig();
    } catch (err) {
      error.value = err instanceof AdminApiError ? err.message : 'chargement de la configuration impossible';
    }
  }

  function flush(): void {
    const toSend = accumulated;
    accumulated = {};
    updateConfig(toSend)
      .then((next) => {
        config.value = next;
        const nonImmediate = Object.keys(toSend).filter(
          (key) => !IMMEDIATE_FIELDS.has(key as keyof GameConfig),
        ) as (keyof GameConfig)[];
        if (nonImmediate.length > 0) {
          pendingFields.value = new Set([...pendingFields.value, ...nonImmediate]);
        }
        saved.value = true;
        if (savedFlashTimer) clearTimeout(savedFlashTimer);
        savedFlashTimer = setTimeout(() => {
          saved.value = false;
        }, SAVED_FLASH_MS);
      })
      .catch((err) => {
        error.value = err instanceof AdminApiError ? err.message : 'enregistrement impossible';
        void load();
      });
  }

  function patch(fields: Partial<GameConfig>): void {
    if (!config.value) return;
    config.value = { ...config.value, ...fields };
    accumulated = { ...accumulated, ...fields };
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }

  if (phase) {
    watch(phase, (value, previous) => {
      if (value !== previous && (value === 'reset' || value === 'running')) {
        pendingFields.value = new Set();
      }
    });
  }

  function setConfig(next: GameConfig): void {
    config.value = next;
  }

  return { config, saved, pendingFields, error, patch, load, setConfig };
}
