<script setup lang="ts">
import { ref, watch } from 'vue';
import DirectionPad from '../components/DirectionPad.vue';
import PseudoScreen from '../components/PseudoScreen.vue';
import { TOKEN_STORAGE_KEY, useSocket } from '../composables/useSocket.js';

const existingToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? undefined;

const { connected, reconnecting, ready, session, join, sendInput } = useSocket('player', existingToken);

const pendingPseudo = ref<string | null>(null);
const suffixNotice = ref<string | null>(null);

function handleJoin(pseudo: string): void {
  pendingPseudo.value = pseudo;
  suffixNotice.value = null;
  join(pseudo);
}

watch(session, (value, previous) => {
  if (value && !previous && pendingPseudo.value && value.pseudo !== pendingPseudo.value) {
    suffixNotice.value = `Ce pseudo était pris, tu es ${value.pseudo} !`;
  }
});
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
    <PseudoScreen
      v-else-if="!session"
      @join="handleJoin"
    />
    <div
      v-else
      class="controller"
    >
      <header class="header">
        <span class="pseudo">{{ session.pseudo }}</span>
        <span
          class="dot"
          :class="{ connected }"
        />
      </header>
      <p
        v-if="suffixNotice"
        class="suffix-notice"
      >
        {{ suffixNotice }}
      </p>
      <DirectionPad @input="sendInput" />
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

.controller {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
  height: 100%;
  justify-content: center;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: bold;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #a33;
}

.dot.connected {
  background: #4caf50;
}

.suffix-notice {
  color: #ffcf6b;
  font-size: 0.9rem;
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
