<script setup lang="ts">
import type { GameConfig } from '@tentaclaire/shared';

const props = defineProps<{
  config: GameConfig;
  pendingFields: Set<keyof GameConfig>;
}>();
const emit = defineEmits<{ patch: [fields: Partial<GameConfig>] }>();

function onModeChange(event: Event): void {
  emit('patch', { movementMode: (event.target as HTMLInputElement).value as GameConfig['movementMode'] });
}

function onCooldownInput(event: Event): void {
  emit('patch', { chaosCooldownMs: Number((event.target as HTMLInputElement).value) });
}

function onWindowInput(event: Event): void {
  emit('patch', { democracyWindowMs: Number((event.target as HTMLInputElement).value) });
}

function onTorchRadiusChange(event: Event): void {
  const radius = Number((event.target as HTMLInputElement).value) as GameConfig['torchRadius'];
  emit('patch', { torchRadius: radius });
}

function pendingLabel(field: keyof GameConfig): string {
  return props.pendingFields.has(field) ? 'Appliqué au prochain lancement' : '';
}
</script>

<template>
  <section class="section">
    <h2>Déplacements</h2>
    <div class="radio-group">
      <label>
        <input
          type="radio"
          name="movementMode"
          value="chaos"
          :checked="config.movementMode === 'chaos'"
          @change="onModeChange"
        >
        Chaos
      </label>
      <label>
        <input
          type="radio"
          name="movementMode"
          value="democratie"
          :checked="config.movementMode === 'democratie'"
          @change="onModeChange"
        >
        Démocratie
      </label>
      <span
        v-if="pendingLabel('movementMode')"
        class="pending-hint"
      >{{ pendingLabel('movementMode') }}</span>
    </div>

    <label
      v-if="config.movementMode === 'chaos'"
      class="field"
    >
      Cooldown : {{ config.chaosCooldownMs }} ms
      <input
        type="range"
        min="100"
        max="5000"
        step="50"
        :value="config.chaosCooldownMs"
        @input="onCooldownInput"
      >
      <span
        v-if="pendingLabel('chaosCooldownMs')"
        class="pending-hint"
      >{{ pendingLabel('chaosCooldownMs') }}</span>
    </label>
    <label
      v-else
      class="field"
    >
      Fenêtre de vote : {{ config.democracyWindowMs }} ms
      <input
        type="range"
        min="100"
        max="5000"
        step="50"
        :value="config.democracyWindowMs"
        @input="onWindowInput"
      >
      <span
        v-if="pendingLabel('democracyWindowMs')"
        class="pending-hint"
      >{{ pendingLabel('democracyWindowMs') }}</span>
    </label>

    <div class="radio-group torch">
      <span class="group-label">Rayon de torche</span>
      <label
        v-for="radius in [0, 1, 2]"
        :key="radius"
      >
        <input
          type="radio"
          name="torchRadius"
          :value="radius"
          :checked="config.torchRadius === radius"
          @change="onTorchRadiusChange"
        >
        <span
          class="pictogram"
          :style="{ gridTemplateColumns: `repeat(${radius * 2 + 1}, 1fr)` }"
        >
          <span
            v-for="cell in (radius * 2 + 1) * (radius * 2 + 1)"
            :key="cell"
            class="cell"
          />
        </span>
        {{ radius === 0 ? 'Case seule' : `${radius * 2 + 1}×${radius * 2 + 1}` }}
      </label>
      <span
        v-if="pendingLabel('torchRadius')"
        class="pending-hint"
      >{{ pendingLabel('torchRadius') }}</span>
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

.radio-group {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.group-label {
  color: #666;
  font-size: 0.85rem;
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

.torch label {
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
}

.pictogram {
  display: grid;
  gap: 1px;
  width: 32px;
  height: 32px;
}

.cell {
  background: #ffcf6b;
  border-radius: 1px;
}

.pending-hint {
  color: #a87d1f;
  font-size: 0.8rem;
  font-style: italic;
}
</style>
