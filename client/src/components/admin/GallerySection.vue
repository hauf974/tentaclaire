<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { GalleryImage, GameConfig } from '@tentaclaire/shared';
import { computeAutoGridRows } from '@tentaclaire/shared';
import {
  activateImage,
  AdminApiError,
  deleteImage,
  listImages,
  uploadImage,
} from '../../composables/useAdminApi.js';

const props = defineProps<{ config: GameConfig }>();
const emit = defineEmits<{
  patch: [fields: Partial<GameConfig>];
  configReplaced: [config: GameConfig];
  actionError: [message: string];
}>();

const images = ref<GalleryImage[]>([]);
const uploading = ref(false);
const dragOver = ref(false);

async function refresh(): Promise<void> {
  try {
    images.value = await listImages();
  } catch (err) {
    emit('actionError', err instanceof AdminApiError ? err.message : 'chargement de la galerie impossible');
  }
}
onMounted(refresh);

async function handleFiles(files: FileList | null | undefined): Promise<void> {
  const file = files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    await uploadImage(file);
    await refresh();
  } catch (err) {
    emit('actionError', err instanceof AdminApiError ? err.message : 'envoi impossible');
  } finally {
    uploading.value = false;
  }
}

function onFileInput(event: Event): void {
  void handleFiles((event.target as HTMLInputElement).files);
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  dragOver.value = false;
  void handleFiles(event.dataTransfer?.files);
}

async function activate(id: string): Promise<void> {
  try {
    const next = await activateImage(id);
    emit('configReplaced', next);
  } catch (err) {
    emit('actionError', err instanceof AdminApiError ? err.message : 'activation impossible');
  }
}

async function remove(id: string): Promise<void> {
  try {
    await deleteImage(id);
    await refresh();
  } catch (err) {
    emit('actionError', err instanceof AdminApiError ? err.message : 'suppression impossible');
  }
}

const activeImage = computed(() => images.value.find((image) => image.id === props.config.activeImageId) ?? null);

const previewRows = computed(() => {
  if (!activeImage.value) return null;
  return computeAutoGridRows(props.config.gridCols, activeImage.value.width, activeImage.value.height);
});

function onGridAutoChange(event: Event): void {
  emit('patch', { gridAuto: (event.target as HTMLInputElement).checked });
}

function onGridColsInput(event: Event): void {
  emit('patch', { gridCols: Number((event.target as HTMLInputElement).value) || 5 });
}

function onGridRowsInput(event: Event): void {
  emit('patch', { gridRows: Number((event.target as HTMLInputElement).value) || 5 });
}
</script>

<template>
  <section class="section">
    <h2>Galerie</h2>
    <div
      class="dropzone"
      :class="{ over: dragOver }"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <p>Glissez une image ici, ou</p>
      <label class="file-button">
        Choisir un fichier
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          @change="onFileInput"
        >
      </label>
      <p class="hint">
        JPG, PNG ou WebP — 10 Mo maximum
      </p>
      <p
        v-if="uploading"
        class="uploading"
      >
        Envoi en cours…
      </p>
    </div>

    <div
      v-if="images.length > 0"
      class="thumbnails"
    >
      <div
        v-for="image in images"
        :key="image.id"
        class="thumbnail"
      >
        <img
          :src="`/uploads/${image.filename}`"
          :alt="image.originalName"
        >
        <span
          v-if="image.id === config.activeImageId"
          class="badge"
        >Active</span>
        <div class="thumbnail-actions">
          <button
            type="button"
            :disabled="image.id === config.activeImageId"
            @click="activate(image.id)"
          >
            Utiliser
          </button>
          <button
            type="button"
            class="danger"
            :disabled="image.id === config.activeImageId"
            @click="remove(image.id)"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
    <p
      v-else
      class="empty"
    >
      Aucune image envoyée pour le moment.
    </p>

    <h2>Grille</h2>
    <label class="checkbox-field">
      <input
        type="checkbox"
        :checked="config.gridAuto"
        @change="onGridAutoChange"
      >
      Automatique selon l'image
    </label>
    <div class="grid-fields">
      <label class="field">
        Colonnes
        <input
          type="number"
          min="5"
          max="50"
          :value="config.gridCols"
          @input="onGridColsInput"
        >
      </label>
      <label
        v-if="!config.gridAuto"
        class="field"
      >
        Lignes
        <input
          type="number"
          min="5"
          max="50"
          :value="config.gridRows"
          @input="onGridRowsInput"
        >
      </label>
      <p
        v-else
        class="computed-rows"
      >
        Lignes calculées : {{ previewRows ?? '—' }}
      </p>
    </div>
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

.dropzone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  color: #666;
}

.dropzone.over {
  border-color: #2a4dff;
  background: #f0f3ff;
}

.dropzone p {
  margin: 0.3rem 0;
}

.hint {
  font-size: 0.8rem;
  color: #999;
}

.uploading {
  color: #2a4dff;
}

.file-button {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  background: #2a4dff;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
}

.file-button input {
  display: none;
}

.thumbnails {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}

.thumbnail {
  position: relative;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.thumbnail img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
}

.badge {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  background: #237a3a;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.thumbnail-actions {
  display: flex;
  gap: 0.3rem;
  padding: 0.4rem;
}

.thumbnail-actions button {
  flex: 1;
  font-size: 0.75rem;
  padding: 0.3rem;
  border-radius: 4px;
  border: none;
  background: #e0e2e8;
}

.thumbnail-actions button:disabled {
  opacity: 0.5;
}

.thumbnail-actions button.danger {
  background: #fde0e0;
  color: #a83232;
}

.empty {
  color: #888;
  font-size: 0.9rem;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.grid-fields {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.9rem;
  color: #444;
}

.field input {
  width: 5rem;
  padding: 0.4rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  text-align: center;
}

.computed-rows {
  color: #666;
  font-size: 0.9rem;
}
</style>
