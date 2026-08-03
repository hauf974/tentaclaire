<script setup lang="ts">
import { ref } from 'vue';
import { AdminApiError, login } from '../../composables/useAdminApi.js';

const emit = defineEmits<{ loggedIn: [] }>();

const password = ref('');
const error = ref<string | null>(null);
const submitting = ref(false);

async function submit(): Promise<void> {
  if (!password.value || submitting.value) return;
  submitting.value = true;
  error.value = null;
  try {
    await login(password.value);
    emit('loggedIn');
  } catch (err) {
    error.value = err instanceof AdminApiError ? err.message : 'connexion impossible';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login">
    <h1>Tentaclaire — Administration</h1>
    <input
      v-model="password"
      type="password"
      placeholder="Mot de passe"
      autocomplete="current-password"
      @keyup.enter="submit"
    >
    <button
      type="button"
      :disabled="!password || submitting"
      @click="submit"
    >
      Se connecter
    </button>
    <p
      v-if="error"
      class="error"
    >
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  padding: 1.5rem;
  background: #f4f5f7;
  color: #1a1d24;
  font-family: sans-serif;
  text-align: center;
}

input {
  width: 100%;
  max-width: 280px;
  font-size: 1rem;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  box-sizing: border-box;
}

button {
  width: 100%;
  max-width: 280px;
  font-size: 1rem;
  font-weight: bold;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  border: none;
  background: #2a4dff;
  color: white;
}

button:disabled {
  background: #aab0c0;
}

.error {
  color: #c0392b;
  font-size: 0.9rem;
}
</style>
