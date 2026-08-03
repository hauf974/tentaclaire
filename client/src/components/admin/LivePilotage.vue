<script setup lang="ts">
import { computed } from 'vue';
import type { GamePhase } from '@tentaclaire/shared';
import { AdminApiError, launchGame, pauseGame, resetGame } from '../../composables/useAdminApi.js';

const props = defineProps<{ phase: GamePhase; timerRemainingMs: number; playerCount: number }>();

const emit = defineEmits<{ actionError: [message: string] }>();

const PHASE_LABELS: Record<GamePhase, string> = {
  idle: 'En attente',
  reset: 'Prête',
  running: 'En cours',
  paused: 'Pause',
  victory: 'Victoire',
  defeat: 'Défaite',
};

const phaseLabel = computed(() => PHASE_LABELS[props.phase]);

const formattedTimer = computed(() => {
  const totalSeconds = Math.max(0, Math.ceil(props.timerRemainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

const canLaunch = computed(() => props.phase === 'reset' || props.phase === 'paused');
const canPause = computed(() => props.phase === 'running');
const gameInProgress = computed(() => props.phase === 'running' || props.phase === 'paused');

async function handle(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (err) {
    emit('actionError', err instanceof AdminApiError ? err.message : 'action impossible');
  }
}

function onLaunch(): void {
  void handle(launchGame);
}

function onPause(): void {
  void handle(pauseGame);
}

function onReset(): void {
  if (gameInProgress.value && !window.confirm('Réinitialiser alors qu\'une partie est en cours ? La progression sera perdue.')) {
    return;
  }
  void handle(resetGame);
}
</script>

<template>
  <section class="pilotage">
    <div class="status">
      <span
        class="badge"
        :class="phase"
      >{{ phaseLabel }}</span>
      <span class="timer">{{ formattedTimer }}</span>
      <span class="players">{{ playerCount }} joueur{{ playerCount === 1 ? '' : 's' }} connecté{{ playerCount === 1 ? '' : 's' }}</span>
    </div>
    <div class="actions">
      <button
        type="button"
        :disabled="!canLaunch"
        @click="onLaunch"
      >
        Lancer
      </button>
      <button
        type="button"
        :disabled="!canPause"
        @click="onPause"
      >
        Pause
      </button>
      <button
        type="button"
        class="danger"
        @click="onReset"
      >
        Réinitialiser
      </button>
    </div>
  </section>
</template>

<style scoped>
.pilotage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-weight: bold;
  font-size: 0.85rem;
  background: #e0e2e8;
  color: #444;
}

.badge.running {
  background: #dff5e1;
  color: #237a3a;
}

.badge.paused {
  background: #fff3cd;
  color: #8a6d1f;
}

.badge.victory {
  background: #d7ecff;
  color: #1a5fa8;
}

.badge.defeat {
  background: #fde0e0;
  color: #a83232;
}

.timer {
  font-variant-numeric: tabular-nums;
  font-weight: bold;
}

.players {
  color: #666;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 0.6rem;
}

.actions button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  background: #2a4dff;
  color: white;
  font-weight: bold;
}

.actions button:disabled {
  background: #cfd3dc;
  color: #888;
}

.actions button.danger {
  background: #c0392b;
}
</style>
