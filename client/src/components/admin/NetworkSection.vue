<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { GameConfig } from '@tentaclaire/shared';
import { renderQrCode } from '../../utils/renderQrCode.js';

const props = defineProps<{
  config: GameConfig;
  pendingFields: Set<keyof GameConfig>;
}>();
const emit = defineEmits<{ patch: [fields: Partial<GameConfig>] }>();

function onQrUrlInput(event: Event): void {
  emit('patch', { qrUrl: (event.target as HTMLInputElement).value });
}

function onMinutesInput(event: Event): void {
  const minutes = Number((event.target as HTMLInputElement).value) || 0;
  emitTimer(minutes, props.config.timerSeconds % 60);
}

function onSecondsInput(event: Event): void {
  const seconds = Number((event.target as HTMLInputElement).value) || 0;
  emitTimer(Math.floor(props.config.timerSeconds / 60), seconds);
}

function emitTimer(minutes: number, seconds: number): void {
  const total = Math.min(3600, Math.max(10, minutes * 60 + seconds));
  emit('patch', { timerSeconds: total });
}

const canvasRef = ref<HTMLCanvasElement | null>(null);

async function renderPreview(): Promise<void> {
  const canvas = canvasRef.value;
  if (!canvas || !props.config.qrUrl) return;
  await renderQrCode(canvas, props.config.qrUrl);
}

watch(() => props.config.qrUrl, renderPreview);
onMounted(renderPreview);
</script>

<template>
  <section class="section">
    <h2>Réseau</h2>
    <label class="field">
      URL du QR Code
      <input
        type="text"
        :value="config.qrUrl"
        placeholder="https://..."
        @input="onQrUrlInput"
      >
    </label>
    <div class="qr-preview">
      <canvas
        v-if="config.qrUrl"
        ref="canvasRef"
      />
      <p
        v-else
        class="qr-missing"
      >
        Aucune URL configurée
      </p>
    </div>

    <h2>Partie</h2>
    <label class="field timer-field">
      Durée du timer
      <span class="timer-inputs">
        <input
          type="number"
          min="0"
          max="60"
          :value="Math.floor(config.timerSeconds / 60)"
          @input="onMinutesInput"
        > min
        <input
          type="number"
          min="0"
          max="59"
          :value="config.timerSeconds % 60"
          @input="onSecondsInput"
        > s
      </span>
      <span
        v-if="pendingFields.has('timerSeconds')"
        class="pending-hint"
      >
        Appliqué au prochain lancement
      </span>
    </label>
  </section>
</template>

<style scoped>
.section {
  background: white;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

h2 {
  font-size: 1rem;
  margin: 0.5rem 0 0;
}

h2:first-child {
  margin-top: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.9rem;
  color: #444;
}

.field input[type='text'] {
  padding: 0.5rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 0.95rem;
}

.timer-inputs input {
  width: 4rem;
  padding: 0.4rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  text-align: center;
}

.qr-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.qr-missing {
  color: #888;
  font-size: 0.85rem;
}

.pending-hint {
  color: #a87d1f;
  font-size: 0.8rem;
  font-style: italic;
}
</style>
