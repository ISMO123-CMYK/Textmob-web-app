import { apiGet, apiPost } from './client';

/**
 * Structured payload stored on each notification (`notif.data`, mirrored into
 * the push `data`). Lets the Activity row draw media/hashtags/avatars and lets
 * a tap route + reply without a second fetch.
 */
export interface NotificationData {
  kind?: string;
  text?: string;
  image?: string;
  video?: string;
  sticker?: string;
  tags?: string[];
  mentions?: string[];
  postId?: string;
  commentId?: string;
  parentId?: string;
  replyToUsername?: string;
  replyable?: boolean;
  reaction?: string;
  amount?: number;
  groupId?: string;
  groupName?: string;
  statusId?: string;
  actor?: {
    username?: string;
    fullname?: string;
    profile_pic?: string;
  };
}

export interface AppNotification {
  id: string;
  type: string;
  title?: string;
  username: string;
  sender: string;
  senderPic?: string;
  message: string;
  link: string;
  read: boolean;
  timestamp: string;
  created_at: string;
  data?: NotificationData;
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
