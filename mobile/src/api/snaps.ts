import { apiGet, apiPost, uploadFile } from './client';

export interface Snap {
  id?: string;
  username: string;
  text?: string;
  media: string[];
  created_at: string;
}

export interface Spark {
  username: string;
  text?: string;
  media: string[];
  created_at: string;
}

export async function createSnapAPI(formData: FormData, onProgress?: (p: number) => void) {
  return uploadFile<{ id: string }>('/create-snap', formData, onProgress);
}

export async function createSparkAPI(formData: FormData, onProgress?: (p: number) => void) {
  return uploadFile<{ id: string }>('/create-spark', formData, onProgress);
}

export async function getSparksAPI(username: string) {
  return apiGet<Spark[]>(`/get-sparks?username=${encodeURIComponent(username)}`);
}

export async function searchSnapsAPI(query: string, limit: number = 12) {
  const res = await apiGet<any>(`/snaps-search?query=${encodeURIComponent(query)}&limit=${limit}`);
  return { ...res, data: Array.isArray(res.data) ? res.data : (res.data?.snaps || []) };
}
