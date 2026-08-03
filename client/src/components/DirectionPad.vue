<script setup lang="ts">
import type { Direction } from '@tentaclaire/shared';

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });

const emit = defineEmits<{ input: [direction: Direction] }>();

function press(direction: Direction): void {
  emit('input', direction);
  if (navigator.vibrate) navigator.vibrate(20);
}
</script>

<template>
  <div class="pad">
    <button
      class="btn up"
      type="button"
      :disabled="disabled"
      @pointerdown.prevent="press('up')"
    >
      ⬆️
    </button>
    <button
      class="btn left"
      type="button"
      :disabled="disabled"
      @pointerdown.prevent="press('left')"
    >
      ⬅️
    </button>
    <button
      class="btn right"
      type="button"
      :disabled="disabled"
      @pointerdown.prevent="press('right')"
    >
      ➡️
    </button>
    <button
      class="btn down"
      type="button"
      :disabled="disabled"
      @pointerdown.prevent="press('down')"
    >
      ⬇️
    </button>
  </div>
</template>

<style scoped>
.pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0.75rem;
  width: min(80vw, 340px);
  height: min(80vw, 340px);
  touch-action: manipulation;
  user-select: none;
}

.btn {
  font-size: 2.5rem;
  border: none;
  border-radius: 16px;
  background: #2a3040;
  color: #eee;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.btn:active {
  background: #6c8cff;
  transform: scale(0.95);
}

.btn:disabled {
  background: #1c1f28;
  color: #555;
}

.up {
  grid-column: 2;
  grid-row: 1;
}

.left {
  grid-column: 1;
  grid-row: 2;
}

.right {
  grid-column: 3;
  grid-row: 2;
}

.down {
  grid-column: 2;
  grid-row: 3;
}
</style>
