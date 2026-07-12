import { apiGet, apiPost } from './client';

export interface AppNotification {
  id: string;
  type: string;
  username: string;
  sender: string;
  senderPic?: string;
  message: string;
  link: string;
  read: boolean;
  timestamp: string;
  created_at: string;
}

export async function getNotificationsAPI(username: string) {
  return apiGet<AppNotification[]>(`/get-notifications?username=${encodeURIComponent(username)}`);
}

export async function markNotificationReadAPI(username: string, notificationId: string) {
  return apiPost<{ ok: boolean }>('/mark-notification-read', { username, notificationId });
}

export async function deleteNotificationAPI(username: string, notificationId: string) {
  return apiPost<{ ok: boolean }>('/delete-notification', { username, notificationId });
}

export async function deleteAllNotificationsAPI(username: string) {
  return apiPost<{ ok: boolean }>('/delete-all-notifications', { username });
}

export async function getMsUnreadAPI(username: string) {
  return apiGet<{ unreadCount: number }>(`/ms-unread?username=${encodeURIComponent(username)}`);
}

export async function getLoudaUnreadAPI(username: string) {
  return apiGet<{ unreadCount: number }>(`/api/louda-unread?username=${encodeURIComponent(username)}`);
}
