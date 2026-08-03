<script setup lang="ts">
import { computed } from 'vue';
import type { Direction, MovementMode } from '@tentaclaire/shared';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    movementMode?: MovementMode;
    cooldownRemainingMs?: number;
    chaosCooldownMs?: number;
    democracyWindowMs?: number;
  }>(),
  {
    disabled: false,
    movementMode: 'chaos',
    cooldownRemainingMs: 0,
    chaosCooldownMs: 500,
    democracyWindowMs: 300,
  },
);

const emit = defineEmits<{ input: [direction: Direction] }>();

function press(direction: Direction): void {
  emit('input', direction);
  if (navigator.vibrate) navigator.vibrate(20);
}

/** Fraction 0..1 du cooldown restant (mode chaos), pour l'anneau de progression. */
const cooldownFraction = computed(() => {
  if (props.movementMode !== 'chaos' || props.chaosCooldownMs <= 0) return 0;
  return Math.min(1, Math.max(0, props.cooldownRemainingMs / props.chaosCooldownMs));
});

const padStyle = computed(() => ({ '--vote-duration': `${props.democracyWindowMs}ms` }));
</script>

<template>
  <div
    class="pad"
    :style="padStyle"
  >
    <button
      class="btn up"
      type="button"
      :disabled="disabled"
      :style="{ '--fraction': cooldownFraction }"
      @pointerdown.prevent="press('up')"
    >
      ⬆️
    </button>
    <button
      class="btn left"
      type="button"
      :disabled="disabled"
      :style="{ '--fraction': cooldownFraction }"
      @pointerdown.prevent="press('left')"
    >
      ⬅️
    </button>
    <button
      class="btn right"
      type="button"
      :disabled="disabled"
      :style="{ '--fraction': cooldownFraction }"
      @pointerdown.prevent="press('right')"
    >
      ➡️
    </button>
    <button
      class="btn down"
      type="button"
      :disabled="disabled"
      :style="{ '--fraction': cooldownFraction }"
      @pointerdown.prevent="press('down')"
    >
      ⬇️
    </button>
    <span
      v-if="movementMode === 'democratie' && !disabled"
      class="vote-label"
    >
      Vote en cours
    </span>
  </div>
</template>

<style scoped>
.pad {
  position: relative;
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
  position: relative;
  font-size: 2.5rem;
  border: none;
  border-radius: 16px;
  background: #2a3040;
  color: #eee;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: conic-gradient(rgba(0, 0, 0, 0.55) calc(var(--fraction, 0) * 360deg), transparent 0);
}

.vote-label {
  position: absolute;
  bottom: -2rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.85rem;
  color: #999;
  animation: vote-pulse var(--vote-duration, 300ms) ease-in-out infinite;
}

@keyframes vote-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
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
