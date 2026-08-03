<script setup lang="ts">
import { useSocket } from '../composables/useSocket.js';

const { connected, reconnecting, state, config } = useSocket('screen');
</script>

<template>
  <div class="screen">
    <div
      v-if="reconnecting"
      class="reconnect-banner"
    >
      Reconnexion…
    </div>

    <!-- Vue de débogage minimale (ticket 3.1) : le rendu Canvas complet arrive au ticket 3.2. -->
    <div
      v-if="state"
      class="debug"
    >
      <p>Connecté : {{ connected }}</p>
      <p>Phase : {{ state.phase }}</p>
      <p>Grille : {{ state.cols }} x {{ state.rows }}</p>
      <p>Personnage : ({{ state.character.pos.col }}, {{ state.character.pos.row }})</p>
      <p>Fantômes : {{ state.ghosts.length }}</p>
      <p>Timer : {{ state.timerRemainingMs }} ms</p>
      <p>Joueurs : {{ state.playerCount }}</p>
      <p v-if="config">
        Thème : {{ config.theme }}
      </p>
    </div>
    <div v-else>
      En attente de connexion au serveur…
    </div>
  </div>
</template>

<style scoped>
.screen {
  min-height: 100vh;
  background: #10131a;
  color: #eee;
  font-family: sans-serif;
  padding: 1rem;
}

.reconnect-banner {
  background: #a33;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 1rem;
}
</style>
