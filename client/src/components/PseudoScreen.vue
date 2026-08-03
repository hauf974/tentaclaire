<script setup lang="ts">
import { computed, ref } from 'vue';

const emit = defineEmits<{ join: [pseudo: string] }>();

const value = ref('');
const trimmed = computed(() => value.value.trim());
const canSubmit = computed(() => trimmed.value.length >= 1 && trimmed.value.length <= 20);

function submit(): void {
  if (!canSubmit.value) return;
  emit('join', trimmed.value);
}
</script>

<template>
  <div class="pseudo-screen">
    <h1>Tentaclaire</h1>
    <p class="subtitle">
      Rejoins la partie sur l'écran géant !
    </p>
    <input
      v-model="value"
      class="pseudo-input"
      type="text"
      inputmode="text"
      maxlength="20"
      placeholder="Ton pseudo"
      autocomplete="off"
      autocapitalize="off"
      @keyup.enter="submit"
    >
    <button
      class="join-button"
      type="button"
      :disabled="!canSubmit"
      @click="submit"
    >
      Rejoindre la partie
    </button>
  </div>
</template>

<style scoped>
.pseudo-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  height: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 2rem;
}

.subtitle {
  margin: 0 0 1rem;
  color: #aaa;
}

.pseudo-input {
  width: 100%;
  max-width: 320px;
  font-size: 1.25rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 2px solid #444;
  background: #1c202b;
  color: #eee;
  box-sizing: border-box;
}

.pseudo-input:focus {
  outline: none;
  border-color: #6c8cff;
}

.join-button {
  width: 100%;
  max-width: 320px;
  font-size: 1.25rem;
  font-weight: bold;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  border: none;
  background: #6c8cff;
  color: #10131a;
  touch-action: manipulation;
}

.join-button:disabled {
  background: #3a3f4d;
  color: #777;
}
</style>
