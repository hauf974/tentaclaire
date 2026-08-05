<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { FeedDisplayEntry } from '../composables/useActivityFeed.js';
import { pseudoColor } from '../utils/pseudoColor.js';

const props = defineProps<{ entries: FeedDisplayEntry[] }>();

const DIRECTION_EMOJI: Record<string, string> = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };

const listRef = ref<HTMLElement | null>(null);

watch(
  () => props.entries.length,
  async () => {
    await nextTick();
    const el = listRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  },
);
</script>

<template>
  <div
    ref="listRef"
    class="feed"
  >
    <p
      v-for="entry in entries"
      :key="entry.id"
      class="entry"
      :class="{ system: entry.kind === 'system' }"
    >
      <template v-if="entry.kind === 'player'">
        <span
          class="pseudo"
          :style="{ color: pseudoColor(entry.pseudo ?? '') }"
        >{{ entry.pseudo }}</span>
        a appuyé sur {{ DIRECTION_EMOJI[entry.direction ?? ''] ?? '' }}
      </template>
      <template v-else>
        {{ entry.message }}
      </template>
    </p>
  </div>
</template>

<style scoped>
.feed {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-top: 0.5rem;
  font-size: 1.53rem; /* 0.85rem x1,8 (R2, lisibilité à distance de bar) */
}

.entry {
  margin: 0;
}

.entry.system {
  color: #ffcf6b;
  font-style: italic;
}

.pseudo {
  font-weight: bold;
}
</style>
