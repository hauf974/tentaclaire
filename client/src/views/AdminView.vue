<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AdminLogin from '../components/admin/AdminLogin.vue';
import { getConfig, logout } from '../composables/useAdminApi.js';

const authenticated = ref<boolean | null>(null);

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
        <p>Tableau de bord (à venir)</p>
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

.sections {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
