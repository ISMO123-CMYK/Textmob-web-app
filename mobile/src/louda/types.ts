// Ported 1:1 from web LoudaApp.jsx shapes (louda-back-end Supabase schema).

export interface LoudaUser {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
  last_seen?: string | null;
  status?: string | null;
  is_online?: boolean;
}

export interface ReactionEntry {
  emoji: string;
  userId: string;
}

export interface ReplyTo {
  id: string;
  text?: string;
  media?: string | null;
  from?: string;
  fromName?: string;
}

export interface Message {
  id: string;
  chat_id?: string;
  group_id?: string | null;
  sender_id: string;
  sender_name?: string | null;
  sender_avatar?: string | null;
  text?: string | null;
  media?: string | null;
  media_type?: 'image' | 'video' | 'audio' | 'file' | null;
  type?: 'text' | 'voice' | 'image' | 'video' | 'file' | string;
  reply_to?: ReplyTo | null;
  quotedStatus?: { id: string; type: string; content?: string; media_url?: string } | null;
  reactions?: ReactionEntry[];
  read_by?: { userId: string; readAt?: string }[];
  status?: 'sent' | 'delivered' | 'read' | string;
  pinned?: boolean;
  is_system?: string | boolean;
  edited?: boolean;
  translations?: Record<string, string> | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_id: string;
  username?: string | null;
  name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  typing?: boolean;
  online?: boolean;
  archived?: boolean;
  blocked?: boolean;
  is_group?: boolean;
  nickname?: string | null;
}

export interface Group {
  id: string;
  name?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  owner_id: string;
  admins?: string[];
  members?: string[] | GroupMember[];
  member_count?: number;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  typing?: boolean;
  archived?: boolean;
  muted?: boolean;
  mode?: 'open' | 'moderated' | 'locked';
  created_at?: string;
}

export interface GroupMember {
  id?: string;
  user_id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  nickname?: string | null;
  role?: 'owner' | 'admin' | 'member';
}

export type ChatKind = 'single' | 'group';

export interface ChatSummary {
  kind: ChatKind;
  id: string;
  contact?: Contact | null;
  group?: Group | null;
  title: string;
  subtitle: string;
  avatar: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unread: number;
  typing: boolean;
  online: boolean;
  archived: boolean;
  pinned?: boolean;
  muted?: boolean;
  raw: Contact | Group;
}

export interface StatusItem {
  id: string;
  user_id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  type: 'text' | 'image' | 'video' | string;
  content?: string | null;
  media_url?: string | null;
  bg_color?: string | null;
  font?: string | null;
  caption?: string | null;
  music?: { name?: string; artist?: string; url?: string } | null;
  views?: { userId: string; viewedAt?: string }[];
  reactions?: ReactionEntry[];
  created_at: string;
}

export interface TextmobProfile {
  username: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
}

export interface ForwardTarget {
  kind: ChatKind;
  id: string;
  title: string;
  avatar: string | null;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  created_at?: string;
  message_id?: string;
}
