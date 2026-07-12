import { apiGet, apiPost } from './client';

export type AnalyticsEvent =
  | 'app_open'
  | 'app_close'
  | 'page_view'
  | 'heartbeat'
  | 'scroll_depth'
  | 'post_like'
  | 'post_comment'
  | 'post_react'
  | 'poll_vote';

export async function trackEvent(event: AnalyticsEvent, metadata: Record<string, any> = {}) {
  return apiPost('/tatu', { event, metadata });
}

export interface HallOfFameEntry {
  username: string;
  avatar?: string;
  score?: number;
  points?: number;
}

export async function getHallOfFameAPI() {
  return apiGet<HallOfFameEntry[]>('/hall-of-fame');
}
