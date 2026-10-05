import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

export const GIPHY_API_KEY = '1PsuVrcwCRiOYQEfqgPOd9kVuoRmuhai';
export const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';
export const DEFAULT_PIC = 'https://api.dicebear.com/10.x/adventurer-neutral/png?seed=textmob&backgroundColor=18181b';

/* Same categories as desktop — no emojis on desktop */
export const CATEGORIES = ['all', 'general', 'football', 'technology', 'music', 'politics', 'religion', 'entertainment', 'gaming', 'business', 'education'];
/* Same 10 reaction emojis as desktop */
export const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👍', '😮', '😢', '👏', '🙏', '💯', '😍'];

export const PAGE = 30;

export interface Room {
  id: string;
  title: string;
  description?: string;
  host_username: string;
  category?: string;
  room_mode?: string;
  status: string;
  participant_count?: number;
  message_count?: number;
  duration_seconds?: number;
  ended_at?: string;
  muted_users?: string[];
  archive_post_id?: string;
  created_at: string;
  pinned_message_id?: string | null;
  unlocked?: boolean;
  members?: string[];
}

export interface Msg {
  id: string;
  room_id: string;
  username: string;
  content: string;
  message_type: string;
  media_url?: string;
  gif_url?: string;
  profile_pic?: string;
  reply_to_id?: string | null;
  is_pinned?: boolean;
  is_deleted?: boolean;
  reactions?: Record<string, string[]>;
  reaction_count?: number;
  created_at: string;
}

export function timeAgo(d: string | null | undefined) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function clockTime(d: string | null | undefined) {
  if (!d) return '';
  try { return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { return ''; }
}

export function dayLabel(d: string | null | undefined) {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(date); that.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  try { return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return ''; }
}

export function formatDuration(secs: number) {
  if (!secs) return '0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* Markdown renderer — mirrors desktop renderMarkdown() */
const md = StyleSheet.create({
  plain: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  bold: { fontSize: 14, color: '#1f2937', lineHeight: 20, fontWeight: 'bold' },
  italic: { fontSize: 14, color: '#1f2937', lineHeight: 20, fontStyle: 'italic' },
  code: { fontSize: 13, color: '#1f2937', backgroundColor: '#f3f4f6', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  strike: { fontSize: 14, color: '#1f2937', lineHeight: 20, textDecorationLine: 'line-through' },
  link: { fontSize: 14, color: '#2563eb', lineHeight: 20, textDecorationLine: 'underline' },
});

export function renderMarkdownText(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`|~~(.+?)~~|(https?:\/\/[^\s]+))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let k = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(<Text key={`t${k++}`} style={md.plain}>{text.slice(lastIndex, match.index)}</Text>);
    if (match[2] || match[3]) parts.push(<Text key={`t${k++}`} style={md.bold}>{match[2] || match[3]}</Text>);
    else if (match[4] || match[5]) parts.push(<Text key={`t${k++}`} style={md.italic}>{match[4] || match[5]}</Text>);
    else if (match[6]) parts.push(<Text key={`t${k++}`} style={md.code}>{match[6]}</Text>);
    else if (match[7]) parts.push(<Text key={`t${k++}`} style={md.strike}>{match[7]}</Text>);
    else if (match[8]) parts.push(<Text key={`t${k++}`} style={md.link}>{match[8]}</Text>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(<Text key={`t${k++}`} style={md.plain}>{text.slice(lastIndex, text.length)}</Text>);
  return parts.length > 0 ? parts : [<Text key="t0" style={md.plain}>{text}</Text>];
}

/* Groups messages exactly like desktop: date dividers + 5-minute run grouping,
   system messages dropped, deleted messages kept as tombstones. */
export type FeedItem =
  | { kind: 'date'; key: string; label: string }
  | { kind: 'msg'; key: string; msg: Msg; grouped: boolean; replyToMsg: Msg | null };

export function buildFeed(messages: Msg[]): FeedItem[] {
  const out: FeedItem[] = [];
  const byId = new Map(messages.map(m => [m.id, m]));
  let lastDay = '';
  let prev: Msg | null = null;
  for (const msg of messages) {
    if (msg.message_type === 'system') { prev = null; continue; }
    const d = dayLabel(msg.created_at);
    if (d !== lastDay) { out.push({ kind: 'date', key: `day-${msg.id}`, label: d }); lastDay = d; }
    const grouped = !!prev
      && prev.username === msg.username
      && prev.message_type !== 'system'
      && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 300000;
    out.push({
      kind: 'msg',
      key: msg.id,
      msg,
      grouped,
      replyToMsg: msg.reply_to_id ? byId.get(msg.reply_to_id) || null : null,
    });
    prev = msg;
  }
  return out;
}
