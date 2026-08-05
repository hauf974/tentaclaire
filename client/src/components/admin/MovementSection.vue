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

const FIXED_START_POSITIONS: {
  value: Exclude<GameConfig['startPosition'], 'random'>;
  label: string;
  row: 0 | 1 | 2;
  col: 0 | 1 | 2;
}[] = [
  { value: 'top-left', label: 'Coin haut-gauche', row: 0, col: 0 },
  { value: 'top-center', label: 'Haut', row: 0, col: 1 },
  { value: 'top-right', label: 'Coin haut-droit', row: 0, col: 2 },
  { value: 'middle-left', label: 'Gauche', row: 1, col: 0 },
  { value: 'center', label: 'Centre', row: 1, col: 1 },
  { value: 'middle-right', label: 'Droite', row: 1, col: 2 },
  { value: 'bottom-left', label: 'Coin bas-gauche', row: 2, col: 0 },
  { value: 'bottom-center', label: 'Bas', row: 2, col: 1 },
  { value: 'bottom-right', label: 'Coin bas-droit', row: 2, col: 2 },
];

function onStartPositionChange(event: Event): void {
  emit('patch', { startPosition: (event.target as HTMLInputElement).value as GameConfig['startPosition'] });
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

    <div class="start-position-group">
      <span class="group-label">Point de départ</span>
      <div class="start-position-grid">
        <label
          v-for="position in FIXED_START_POSITIONS"
          :key="position.value"
          class="start-position-option"
        >
          <input
            type="radio"
            name="startPosition"
            :value="position.value"
            :checked="config.startPosition === position.value"
            @change="onStartPositionChange"
          >
          <span
            class="pictogram start-pictogram"
          >
            <span
              v-for="cell in 9"
              :key="cell"
              class="cell"
              :class="{ active: Math.floor((cell - 1) / 3) === position.row && (cell - 1) % 3 === position.col }"
            />
          </span>
          {{ position.label }}
        </label>
        <label class="start-position-option">
          <input
            type="radio"
            name="startPosition"
            value="random"
            :checked="config.startPosition === 'random'"
            @change="onStartPositionChange"
          >
          <span class="pictogram start-pictogram random-pictogram">
            <span
              v-for="cell in 9"
              :key="cell"
              class="cell"
            />
            <span class="question-mark">?</span>
          </span>
          Aléatoire
        </label>
      </div>
      <span
        v-if="pendingLabel('startPosition')"
        class="pending-hint"
      >{{ pendingLabel('startPosition') }}</span>
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

.start-position-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.start-position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  width: fit-content;
}

.start-position-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.75rem;
  text-align: center;
}

.start-pictogram {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  width: 32px;
  height: 32px;
}

.start-pictogram .cell {
  background: #e5e5e5;
}

.start-pictogram .cell.active {
  background: #ffcf6b;
}

.random-pictogram {
  position: relative;
}

.question-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
  color: #a87d1f;
}

.pending-hint {
  color: #a87d1f;
  font-size: 0.8rem;
  font-style: italic;
}
</style>
