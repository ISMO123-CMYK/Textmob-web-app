import { apiGet, apiPost } from './client';

export interface EventData {
  id: string;
  username: string;
  title: string;
  text: string;
  scheduled_for: string;
  location?: string;
  registration_url?: string;
  likes?: string[];
  created_at: string;
}

export async function getEventsFeedAPI(username: string) {
  return apiGet<{ events: EventData[] }>(`/events-feed?username=${encodeURIComponent(username)}`);
}

export async function createEventAPI(data: {
  username: string;
  title: string;
  text: string;
  scheduled_for: string;
  location?: string;
  registration_url?: string;
  visib: string;
}) {
  return apiPost<{ ok: boolean }>('/events', data);
}
