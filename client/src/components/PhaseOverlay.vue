<script setup lang="ts">
defineProps<{ phase: string }>();
</script>

<template>
  <div
    v-if="phase === 'paused'"
    class="overlay veil"
  >
    <span class="message">Pause</span>
  </div>
  <div
    v-else-if="phase === 'victory'"
    class="overlay"
  >
    <span class="message big">Victoire !</span>
  </div>
  <div
    v-else-if="phase === 'defeat'"
    class="overlay"
  >
    <span class="message big">Trop tard !</span>
  </div>
  <div
    v-else-if="phase === 'idle'"
    class="overlay idle-hint"
  >
    <span class="message small">En attente de configuration…</span>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 6;
  pointer-events: none;
}

.veil {
  background: rgba(0, 0, 0, 0.35);
}

.message {
  color: white;
  font-size: 2.5rem;
  font-weight: bold;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
}

.message.big {
  font-size: 5rem;
}

.message.small {
  font-size: 1.2rem;
  color: #999;
  font-weight: normal;
  text-shadow: none;
}
</style>
