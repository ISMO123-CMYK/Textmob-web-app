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
  comments?: Comment[];
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
}

export interface Comment {
  id: string;
  username: string;
  text: string;
  verified?: boolean;
  created_at?: string;
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
}

export async function getFeedPostsAPI(params: FeedParams) {
  const query = new URLSearchParams();
  if (params.username) query.set('username', params.username);
  if (params.tab) query.set('tab', params.tab);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.seenIds) query.set('seenIds', params.seenIds);
  return apiGet<Post[]>(`/get-posts?${query.toString()}`);
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

export async function addCommentAPI(postId: string, username: string, comment: string) {
  return apiPost<{ ok: boolean }>('/add-comment', { postId, username, comment });
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

export async function getUserPostsAPI(username: string) {
  return apiGet<Post[]>(`/get-user-posts?username=${encodeURIComponent(username)}`);
}

export async function getSnapsFeedAPI(username?: string, limit: number = 20, seenIds?: string) {
  const query = new URLSearchParams();
  if (username) query.set('username', username);
  query.set('limit', String(limit));
  if (seenIds) query.set('seenIds', seenIds);
  return apiGet<any>(`/snaps-feed?${query.toString()}`);
}

