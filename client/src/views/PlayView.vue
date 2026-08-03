<script setup lang="ts">
import { TOKEN_STORAGE_KEY, useSocket } from '../composables/useSocket.js';

const existingToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? undefined;

const { reconnecting, ready, session, join } = useSocket('player', existingToken);

function handleJoin(pseudo: string): void {
  join(pseudo);
}
</script>

<template>
  <div class="play">
    <div
      v-if="reconnecting"
      class="reconnect-banner"
    >
      Reconnexion…
    </div>

    <p
      v-if="!ready"
      class="loading"
    >
      Connexion…
    </p>
    <div
      v-else-if="!session"
      class="pseudo-placeholder"
    >
      Écran pseudo (à venir)
      <button
        type="button"
        @click="handleJoin('Testeur')"
      >
        Rejoindre
      </button>
    </div>
    <div
      v-else
      class="pad-placeholder"
    >
      <header>{{ session.pseudo }}</header>
      Manette (à venir)
    </div>
  </div>
</template>

<style scoped>
.play {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  box-sizing: border-box;
  background: #10131a;
  color: #eee;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.reconnect-banner {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: #a33;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  z-index: 10;
}
</style>
