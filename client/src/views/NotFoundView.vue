<script setup lang="ts"></script>

<template>
  <div class="not-found">
    <h1>404</h1>
    <p>Page introuvable.</p>
    <router-link
      to="/play"
      class="link"
    >
      Retour à la manette
    </router-link>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100vw;
  height: 100vh;
  background: #10131a;
  color: #eee;
  font-family: sans-serif;
  text-align: center;
}

h1 {
  font-size: 4rem;
  margin: 0;
}

.link {
  color: #6c8cff;
}
</style>
