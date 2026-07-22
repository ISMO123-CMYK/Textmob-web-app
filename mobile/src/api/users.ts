import { apiGet, apiPost } from './client';

export interface UserProfile {
  username: string;
  fullname: string;
  profile_pic: string;
  verified?: boolean;
  bio?: string;
  biography?: string;
  followers?: string[];
  following?: string[];
  email?: string;
  phone?: string;
  notification_prefs?: any;
  profile_type?: string;
  mobcoins?: number;
}

export interface SuggestedUser {
  username: string;
  fullname: string;
  profile_pic: string;
  mutuals?: number;
}

export async function followAPI(username: string, currentUsername: string, action: string) {
  const normAction = action === 'friend' ? 'follow' : action === 'unfriend' ? 'unfollow' : action;
  return apiPost<{ status: string }>('/follow', { username, currentUsername, action: normAction });
}

export async function friendAPI(username: string, currentUsername: string, action: string) {
  const normAction = action === 'follow' ? 'friend' : action === 'unfollow' ? 'unfriend' : action;
  return apiPost<{ status: string }>('/friend', { username, currentUsername, action: normAction });
}

export async function getFollowStatusAPI(from: string, to: string) {
  return apiGet<{ status: string; profileType: string; label: string }>(
    `/follow-status?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export async function getSuggestionsFeedAPI(username: string) {
  return apiGet<SuggestedUser[]>(`/get-suggestions-feed?username=${encodeURIComponent(username)}`);
}

export async function searchUsersAPI(query: string, limit: number = 10, currentUsername?: string) {
  let endpoint = `/search-users?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (currentUsername) endpoint += `&currentUsername=${encodeURIComponent(currentUsername)}`;
  return apiGet<UserProfile[]>(endpoint);
}

export async function searchAPI(query: string, currentUsername?: string) {
  let endpoint = `/search?query=${encodeURIComponent(query)}`;
  if (currentUsername) endpoint += `&currentUsername=${encodeURIComponent(currentUsername)}`;
  return apiGet<UserProfile[]>(endpoint);
}

export async function searchSuggestAPI(query: string, currentUsername?: string) {
  let endpoint = `/search-suggest?query=${encodeURIComponent(query)}`;
  if (currentUsername) endpoint += `&currentUsername=${encodeURIComponent(currentUsername)}`;
  return apiGet<any[]>(endpoint);
}

export async function getProfilePicAPI(username: string) {
  return apiGet<string>(`/profile-pic/${encodeURIComponent(username)}`);
}

export async function migrateFriendsAPI(username: string) {
  return apiPost<{ ok: boolean }>('/api/migrate-friends', { username });
}

export async function getFollowersAPI(username: string) {
  return apiGet<UserProfile[]>(`/followers?username=${encodeURIComponent(username)}`);
}

export async function getFollowingAPI(username: string) {
  return apiGet<UserProfile[]>(`/following?username=${encodeURIComponent(username)}`);
}

export async function searchGeneralAPI(query: string, currentUsername?: string) {
  return apiGet<any[]>(`/general/search?query=${encodeURIComponent(query)}${currentUsername ? `&currentUsername=${encodeURIComponent(currentUsername)}` : ''}`);
}
