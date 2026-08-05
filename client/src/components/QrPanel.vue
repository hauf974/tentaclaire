<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { renderQrCode } from '../utils/renderQrCode.js';

const props = defineProps<{ qrUrl: string; playerCount: number }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

async function render(): Promise<void> {
  const canvas = canvasRef.value;
  if (!canvas || !props.qrUrl) return;
  await renderQrCode(canvas, props.qrUrl);
}

watch(() => props.qrUrl, render);
onMounted(render);
</script>

<template>
  <div class="qr-panel">
    <canvas
      v-if="qrUrl"
      ref="canvasRef"
      class="qr-canvas"
    />
    <p
      v-else
      class="qr-missing"
    >
      QR Code non configuré
    </p>
    <p class="hint">
      Scannez pour jouer !
    </p>
    <p class="count">
      {{ playerCount }} joueur{{ playerCount === 1 ? '' : 's' }} connecté{{ playerCount === 1 ? '' : 's' }}
    </p>
  </div>
</template>

<style scoped>
.qr-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.qr-canvas {
  border-radius: 4px;
  max-width: 100%;
  height: auto;
}

.qr-missing {
  color: #888;
  font-size: 1.53rem; /* 0.85rem x1,8 (R2, lisibilité à distance de bar) */
}

.hint {
  font-weight: bold;
  margin: 0;
  font-size: 1.8rem; /* 1rem x1,8 (R2) */
}

.count {
  color: #aaa;
  font-size: 1.53rem; /* 0.85rem x1,8 (R2) */
  margin: 0;
}
</style>
