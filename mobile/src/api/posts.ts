import { apiGet, apiPost, apiDelete, apiPut } from './client';

export interface Post {
  id: string | number;
  username: string;
  fullname?: string;
  profile_pic?: string;
  text: string;
  parsed?: string;
  title?: string;
  type?: string;
  media?: string[];
  likes?: string[];
  like_count?: number;
  liked_by_me?: boolean;
  comments?: Comment[];
  comment_count?: number;
  reactions?: Reaction[];
  options?: PollOption[];
  verified?: boolean;
  activities?: string;
  created_at: string;
  scheduled_for?: string;
  location?: string;
  registration_url?: string;
  quoted_post_id?: string;
  group_name?: string;
  group_pic?: string;
  views?: string[];
  view_count?: number;
  reply_count?: number;
  link_preview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    site_name?: string;
  };
}

export interface Comment {
  id: string;
  username: string;
  text: string;
  verified?: boolean;
  created_at?: string;
  parentId?: string;
}

export interface Reaction {
  username: string;
  type: string;
  reaction: string;
  etext?: string;
}

export interface PollOption {
  id: number | string;
  text: string;
  votes: string[];
}

export interface FeedParams {
  username?: string;
  tab?: 'foryou' | 'following';
  page?: number;
  limit?: number;
  seenIds?: string;
  blockedUsers?: string[];
}

export async function getFeedPostsAPI(params: FeedParams) {
  // `lite=1` makes the server swap the view/comment/like arrays for counts.
  return apiPost<Post[]>('/get-posts', { ...params, lite: 1 });
}

// ─── Feed payload helpers ───
// Feed responses replace `views` / `comments` / `likes` with counts (the arrays
// dominated the payload — `views` alone was 42% of a page) while `/get-post`
// still ships the raw arrays. Every read goes through these so both shapes
// work and detail views keep showing real data.

const EMPTY_COMMENT: Comment = { id: '', username: '', text: '' };

export function viewCount(p?: Partial<Post> | null): number {
  if (!p) return 0;
  if (typeof p.view_count === 'number') return p.view_count;
  return Array.isArray(p.views) ? p.views.length : 0;
}

export function likeCount(p?: Partial<Post> | null): number {
  if (!p) return 0;
  if (typeof p.like_count === 'number') return p.like_count;
  return Array.isArray(p.likes) ? p.likes.length : 0;
}

export function commentCount(p?: Partial<Post> | null): number {
  if (!p) return 0;
  if (typeof p.comment_count === 'number') return p.comment_count;
  return Array.isArray(p.comments) ? p.comments.length : 0;
}

export function viewerLiked(p: Partial<Post> | null | undefined, username?: string | null): boolean {
  if (!p || !username) return false;
  if (typeof p.liked_by_me === 'boolean') return p.liked_by_me;
  return Array.isArray(p.likes) && p.likes.includes(username);
}

// The card tracks like/comment counts in local state seeded from the post, then
// incremented optimistically. When the raw array is missing we rebuild a
// placeholder array of the right length so `.length` and `.includes(username)`
// keep working — nothing renders the elements, only the size. The count fields
// win over the arrays because the feed writes back to them.
export function seedLikes(p: Partial<Post>, username?: string | null): string[] {
  if (typeof p.like_count === 'number') {
    const n = Math.max(0, p.like_count);
    const arr: string[] = new Array(n).fill('');
    if (p.liked_by_me && username && n > 0) arr[n - 1] = username;
    return arr;
  }
  return Array.isArray(p.likes) ? p.likes : [];
}

export function seedComments(p: Partial<Post>): Comment[] {
  if (typeof p.comment_count === 'number') {
    const n = Math.max(0, p.comment_count);
    return n > 0 ? new Array(n).fill(EMPTY_COMMENT) : [];
  }
  return Array.isArray(p.comments) ? p.comments : [];
}

export function toggleViewerLike(p: Post, username?: string | null): Post {
  if (!username) return p;
  if (Array.isArray(p.likes)) {
    return {
      ...p,
      likes: p.likes.includes(username) ? p.likes.filter((u) => u !== username) : [...p.likes, username],
    };
  }
  const liked = !!p.liked_by_me;
  return { ...p, liked_by_me: !liked, like_count: Math.max(0, (p.like_count ?? 0) + (liked ? -1 : 1)) };
}

export async function getPostAPI(id: string) {
  return apiGet<Post>(`/get-post?id=${encodeURIComponent(id)}`);
}

export async function createPostAPI(formData: FormData) {
  return apiPost<{ id: string }>('/create-post', formData);
}

export async function editPostAPI(postId: string, username: string, text: string, title?: string) {
  return apiPost<{ ok: boolean }>('/edit-post', { postId, username, text, title });
}

export async function deletePostAPI(postId: string) {
  return apiDelete(`/delete-post?postId=${encodeURIComponent(postId)}`);
}

export async function likePostAPI(postId: string, username: string) {
  return apiPost<{ ok: boolean }>('/like-post', { postId, username });
}

export async function deleteCommentAPI(postId: string, commentId: string, username: string) {
  return apiPost<{ ok: boolean }>('/delete-comment', { postId, commentId, username });
}

export async function addCommentAPI(postId: string, username: string, comment: string, parentId?: string) {
  return apiPost<{ ok: boolean }>('/add-comment', { postId, username, comment, parentId });
}

export async function reactPostAPI(postId: string, username: string, reaction: string, etext: string) {
  return apiPost<{ reactions: Reaction[] }>('/react-post', {
    postId, username, reaction, etext,
  });
}

export async function getPostReactionsAPI(postId: string) {
  return apiGet<{ reactions: Reaction[] }>(`/get-post-reactions?postId=${encodeURIComponent(postId)}`);
}

export async function votePollAPI(postId: string, optionId: string | number, username: string) {
  return apiPost<{ ok: boolean }>('/vote-poll-option', { postId, optionId, username });
}

export async function getUserPostsAPI(username: string, page: number = 0, limit: number = 0) {
  let url = `/get-user-posts?username=${encodeURIComponent(username)}&lite=1`;
  if (page > 0) url += `&page=${page}`;
  if (limit > 0) url += `&limit=${limit}`;
  return apiGet<Post[]>(url);
}

export async function getSnapsFeedAPI(username?: string, limit: number = 10, seenIds?: string, page: number = 1) {
  return apiPost<any>('/snaps-feed', { username, limit, page, seenIds });
}

