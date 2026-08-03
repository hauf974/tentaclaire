<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AdminLogin from '../components/admin/AdminLogin.vue';
import LivePilotage from '../components/admin/LivePilotage.vue';
import { getConfig, logout } from '../composables/useAdminApi.js';
import { useSocket } from '../composables/useSocket.js';

const authenticated = ref<boolean | null>(null);
const actionError = ref<string | null>(null);

const { state } = useSocket('admin');

async function checkAuth(): Promise<void> {
  try {
    await getConfig();
    authenticated.value = true;
  } catch {
    authenticated.value = false;
  }
}

async function handleLogout(): Promise<void> {
  await logout().catch(() => undefined);
  authenticated.value = false;
}

onMounted(checkAuth);
</script>

<template>
  <div class="admin">
    <p
      v-if="authenticated === null"
      class="loading"
    >
      Chargement…
    </p>
    <AdminLogin
      v-else-if="!authenticated"
      @logged-in="checkAuth"
    />
    <div
      v-else
      class="dashboard"
    >
      <header class="top-bar">
        <h1>Tentaclaire — Administration</h1>
        <button
          type="button"
          class="logout"
          @click="handleLogout"
        >
          Déconnexion
        </button>
      </header>
      <main class="sections">
        <p
          v-if="actionError"
          class="action-error"
        >
          {{ actionError }}
        </p>
        <LivePilotage
          v-if="state"
          :phase="state.phase"
          :timer-remaining-ms="state.timerRemainingMs"
          :player-count="state.playerCount"
          @action-error="(message) => (actionError = message)"
        />
        <p>Autres sections à venir</p>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin {
  min-height: 100vh;
  background: #f4f5f7;
  color: #1a1d24;
  font-family: sans-serif;
}

.loading {
  padding: 2rem;
  text-align: center;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #1a1d24;
  color: white;
}

.top-bar h1 {
  font-size: 1.1rem;
  margin: 0;
}

.logout {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: white;
}

.action-error {
  background: #fde0e0;
  color: #a83232;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  margin: 0;
}

.sections {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
