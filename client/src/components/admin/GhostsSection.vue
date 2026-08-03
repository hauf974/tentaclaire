<script setup lang="ts">
import type { GameConfig } from '@tentaclaire/shared';

const props = defineProps<{
  config: GameConfig;
  pendingFields: Set<keyof GameConfig>;
}>();
const emit = defineEmits<{ patch: [fields: Partial<GameConfig>] }>();

const COLLISION_EXPLANATIONS: Record<GameConfig['collisionMode'], string> = {
  passif: 'Un fantôme croisé ne fait rien.',
  mortel_reapparition: 'Le personnage réapparaît au départ, avec une brève invincibilité.',
  mortel_reinitialisation: 'La partie entière est réinitialisée (brouillard, timer, position).',
};

const BEHAVIOR_EXPLANATIONS: Record<GameConfig['ghostBehavior'], string> = {
  aleatoire: 'Déplacement aléatoire, indépendant du personnage.',
  traque: 'Se rapproche progressivement du personnage.',
};

function onCountInput(event: Event): void {
  emit('patch', { ghostCount: Number((event.target as HTMLInputElement).value) });
}

function onSpeedInput(event: Event): void {
  emit('patch', { ghostSpeed: Number((event.target as HTMLInputElement).value) });
}

function onBehaviorChange(event: Event): void {
  emit('patch', { ghostBehavior: (event.target as HTMLInputElement).value as GameConfig['ghostBehavior'] });
}

function onCollisionChange(event: Event): void {
  emit('patch', { collisionMode: (event.target as HTMLInputElement).value as GameConfig['collisionMode'] });
}

function pendingLabel(field: keyof GameConfig): string {
  return props.pendingFields.has(field) ? 'Appliqué au prochain lancement' : '';
}
</script>

<template>
  <section class="section">
    <h2>Fantômes</h2>

    <label class="field">
      Nombre : {{ config.ghostCount }}
      <input
        type="range"
        min="0"
        max="20"
        step="1"
        :value="config.ghostCount"
        @input="onCountInput"
      >
      <span
        v-if="pendingLabel('ghostCount')"
        class="pending-hint"
      >{{ pendingLabel('ghostCount') }}</span>
    </label>

    <label class="field">
      Vitesse : {{ config.ghostSpeed }} case{{ config.ghostSpeed === 1 ? '' : 's' }}/s
      <input
        type="range"
        min="0.5"
        max="5"
        step="0.5"
        :value="config.ghostSpeed"
        @input="onSpeedInput"
      >
      <span
        v-if="pendingLabel('ghostSpeed')"
        class="pending-hint"
      >{{ pendingLabel('ghostSpeed') }}</span>
    </label>

    <div class="radio-list">
      <span class="group-label">Comportement</span>
      <label
        v-for="(explanation, behavior) in BEHAVIOR_EXPLANATIONS"
        :key="behavior"
        class="radio-option"
      >
        <span class="radio-row">
          <input
            type="radio"
            name="ghostBehavior"
            :value="behavior"
            :checked="config.ghostBehavior === behavior"
            @change="onBehaviorChange"
          >
          {{ behavior === 'aleatoire' ? 'Aléatoire' : 'Traque' }}
        </span>
        <span class="explanation">{{ explanation }}</span>
      </label>
      <span
        v-if="pendingLabel('ghostBehavior')"
        class="pending-hint"
      >{{ pendingLabel('ghostBehavior') }}</span>
    </div>

    <div class="radio-list">
      <span class="group-label">Collision</span>
      <label
        v-for="(explanation, mode) in COLLISION_EXPLANATIONS"
        :key="mode"
        class="radio-option"
      >
        <span class="radio-row">
          <input
            type="radio"
            name="collisionMode"
            :value="mode"
            :checked="config.collisionMode === mode"
            @change="onCollisionChange"
          >
          {{ mode === 'passif' ? 'Passif' : mode === 'mortel_reapparition' ? 'Mortel (réapparition)' : 'Mortel (réinitialisation)' }}
        </span>
        <span class="explanation">{{ explanation }}</span>
      </label>
      <span
        v-if="pendingLabel('collisionMode')"
        class="pending-hint"
      >{{ pendingLabel('collisionMode') }}</span>
    </div>
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
  gap: 1rem;
}

h2 {
  font-size: 1rem;
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.9rem;
  color: #444;
}

.field input[type='range'] {
  width: 100%;
  max-width: 320px;
}

.radio-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.group-label {
  color: #666;
  font-size: 0.85rem;
}

.radio-option {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: 0.9rem;
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.explanation {
  color: #888;
  font-size: 0.78rem;
  margin-left: 1.4rem;
}

.pending-hint {
  color: #a87d1f;
  font-size: 0.8rem;
  font-style: italic;
}
</style>
