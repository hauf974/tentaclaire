import type { GalleryImage, GameConfig } from '@tentaclaire/shared';

export class AdminApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: isFormData ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; errors?: string[] } | null;
    const message = body?.error ?? body?.errors?.join(', ') ?? `erreur ${response.status}`;
    throw new AdminApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export function login(password: string): Promise<{ ok: true }> {
  return request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
}

export function logout(): Promise<{ ok: true }> {
  return request('/api/admin/logout', { method: 'POST' });
}

export function getConfig(): Promise<GameConfig> {
  return request('/api/admin/config');
}

export function updateConfig(patch: Record<string, unknown>): Promise<GameConfig> {
  return request('/api/admin/config', { method: 'PUT', body: JSON.stringify(patch) });
}

export function launchGame(): Promise<{ ok: true }> {
  return request('/api/admin/game/launch', { method: 'POST' });
}

export function pauseGame(): Promise<{ ok: true }> {
  return request('/api/admin/game/pause', { method: 'POST' });
}

export function resetGame(): Promise<{ ok: true }> {
  return request('/api/admin/game/reset', { method: 'POST' });
}

export function listImages(): Promise<GalleryImage[]> {
  return request('/api/admin/images');
}

export function uploadImage(file: File): Promise<GalleryImage> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/admin/images', { method: 'POST', body: formData });
}

export function deleteImage(id: string): Promise<{ ok: true }> {
  return request(`/api/admin/images/${id}`, { method: 'DELETE' });
}

export function activateImage(id: string): Promise<GameConfig> {
  return request(`/api/admin/images/${id}/activate`, { method: 'PUT' });
}
