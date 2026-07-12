import { apiGet, apiPost } from './client';
import { Post } from './posts';

export interface LiveStream {
  id: string | number;
  stream_id?: string | number;
  username: string;
  title?: string;
  viewers?: number;
  viewer_count?: number;
  thumbnail?: string;
  is_live?: boolean;
}

export async function getLivePostsAPI(username: string) {
  return apiGet<Post[]>(`/get-live-posts?username=${encodeURIComponent(username)}`);
}

export async function getLiveStreamsAPI() {
  return apiGet<LiveStream[]>('/live-streams');
}

export async function createLiveStreamAPI(username: string, title: string) {
  return apiPost<{ ok: boolean; id?: string; stream_id?: string }>('/live/start', { username, title });
}
