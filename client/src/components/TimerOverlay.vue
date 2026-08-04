<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ timerRemainingMs: number; phase: string }>();

const formatted = computed(() => {
  const totalSeconds = Math.max(0, Math.ceil(props.timerRemainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

const urgent = computed(() => props.timerRemainingMs > 0 && props.timerRemainingMs < 30_000);
const frozen = computed(() => props.phase === 'paused');
</script>

<template>
  <div
    class="timer"
    :class="{ urgent, frozen }"
  >
    {{ formatted }}
  </div>
</template>

<style scoped>
.timer {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 4rem;
  font-weight: bold;
  color: var(--theme-text, #eee);
  font-family: var(--theme-font-display, sans-serif);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  z-index: 5;
  font-variant-numeric: tabular-nums;
}

.timer.urgent {
  color: #ff5f5f;
  animation: timer-pulse 1s ease-in-out infinite;
}

.timer.frozen {
  color: #888;
}

@keyframes timer-pulse {
  0%,
  100% {
    transform: translateX(-50%) scale(1);
  }
  50% {
    transform: translateX(-50%) scale(1.08);
  }
}
</style>
