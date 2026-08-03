<script setup lang="ts">
import type { GameConfig, ThemeId } from '@tentaclaire/shared';

defineProps<{ config: GameConfig }>();
const emit = defineEmits<{ patch: [fields: Partial<GameConfig>] }>();

/** Vignettes provisoires (couleur plate) — les vrais assets arrivent au Lot 6. */
const THEMES: { id: ThemeId; label: string; color: string }[] = [
  { id: 'maraudeur', label: 'Carte du Maraudeur', color: '#b08d57' },
  { id: 'manoir', label: 'Manoir hanté', color: '#5a4a6a' },
  { id: 'halloween', label: 'Halloween', color: '#d9711b' },
  { id: 'cimetiere', label: 'Cimetière', color: '#4a5a52' },
  { id: 'neon', label: 'Néon', color: '#e91ee0' },
];

function selectTheme(id: ThemeId): void {
  emit('patch', { theme: id });
}

function onGridFogChange(event: Event): void {
  emit('patch', { showGridOnFog: (event.target as HTMLInputElement).checked });
}

function onGridRevealedChange(event: Event): void {
  emit('patch', { showGridOnRevealed: (event.target as HTMLInputElement).checked });
}
</script>

<template>
  <section class="section">
    <h2>Thème visuel</h2>
    <div class="theme-cards">
      <button
        v-for="theme in THEMES"
        :key="theme.id"
        type="button"
        class="theme-card"
        :class="{ active: config.theme === theme.id }"
        @click="selectTheme(theme.id)"
      >
        <span
          class="swatch"
          :style="{ background: theme.color }"
        />
        {{ theme.label }}
      </button>
    </div>

    <h2>Quadrillage</h2>
    <label class="checkbox-field">
      <input
        type="checkbox"
        :checked="config.showGridOnFog"
        @change="onGridFogChange"
      >
      Quadrillage sur le brouillard
    </label>
    <label class="checkbox-field">
      <input
        type="checkbox"
        :checked="config.showGridOnRevealed"
        @change="onGridRevealedChange"
      >
      Quadrillage sur l'image révélée
    </label>

    <p class="footer-note">
      Configuration en mémoire uniquement — un redémarrage du serveur revient aux valeurs par défaut.
    </p>
  </section>
</template>

<style scoped>
.section {
  background: white;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

h2 {
  font-size: 1rem;
  margin: 0.5rem 0 0;
}

h2:first-child {
  margin-top: 0;
}

.theme-cards {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem;
  border-radius: 8px;
  border: 2px solid #eee;
  background: white;
  font-size: 0.8rem;
  color: #444;
  width: 100px;
}

.theme-card.active {
  border-color: #2a4dff;
  background: #f0f3ff;
}

.swatch {
  width: 100%;
  height: 48px;
  border-radius: 6px;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.footer-note {
  color: #999;
  font-size: 0.78rem;
  margin: 0.5rem 0 0;
}
</style>
