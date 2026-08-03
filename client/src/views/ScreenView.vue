<script setup lang="ts">
import { computed, ref } from 'vue';
import FeedPanel from '../components/FeedPanel.vue';
import PhaseOverlay from '../components/PhaseOverlay.vue';
import QrPanel from '../components/QrPanel.vue';
import TimerOverlay from '../components/TimerOverlay.vue';
import { useActivityFeed } from '../composables/useActivityFeed.js';
import { useBoardCanvas } from '../composables/useBoardCanvas.js';
import { useSocket } from '../composables/useSocket.js';

const { socket, connected, reconnecting, state, config, activeImageUrl, feed } = useSocket('screen');

const canvasRef = ref<HTMLCanvasElement | null>(null);
const boardContainerRef = ref<HTMLElement | null>(null);
useBoardCanvas(canvasRef, boardContainerRef, state, config, activeImageUrl);

const phase = computed(() => state.value?.phase);
const activityEntries = useActivityFeed(socket, feed, phase);
</script>

<template>
  <div class="screen">
    <div
      v-if="reconnecting"
      class="reconnect-banner"
    >
      Reconnexion…
    </div>

    <div class="layout">
      <aside class="side-panel">
        <QrPanel
          v-if="config"
          :qr-url="config.qrUrl"
          :player-count="state?.playerCount ?? 0"
        />
        <FeedPanel :entries="activityEntries" />
      </aside>

      <div
        ref="boardContainerRef"
        class="board-container"
      >
        <template v-if="state">
          <canvas
            ref="canvasRef"
            class="board-canvas"
          />
          <TimerOverlay
            :timer-remaining-ms="state.timerRemainingMs"
            :phase="state.phase"
          />
          <PhaseOverlay :phase="state.phase" />
        </template>
        <p
          v-else
          class="waiting"
        >
          Connecté : {{ connected }} — en attente de l'état du serveur…
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #10131a;
  color: #eee;
  font-family: sans-serif;
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

.layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.side-panel {
  width: 20%;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  background: #171b26;
  padding: 1rem;
  box-sizing: border-box;
}

.board-container {
  width: 80%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.board-canvas {
  display: block;
}

.waiting {
  color: #999;
}
</style>
