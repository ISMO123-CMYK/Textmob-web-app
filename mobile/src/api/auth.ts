import { apiPost, apiGet } from './client';

export interface User {
  username: string;
  fullname: string;
  profile_pic: string;
  email?: string;
  phone?: string;
  verified?: boolean;
  biography?: string;
  followers?: string[];
  following?: string[];
  notification_prefs?: any;
  profile_type?: string;
  mobcoins?: number;
  // TEXT column in DB: "true" / "false" (server returns the raw row on /login).
  disabled?: string | boolean;
}

// Mirror of the web's AppWrapper check — server returns { disabled: boolean }.
export function isDisabledUser(u: Pick<User, 'disabled'> | null | undefined): boolean {
  return !!u && String((u as any).disabled) === 'true';
}

export interface LoginResponse {
  message: string;
  user: User;
}

export async function loginAPI(identifier: string, password: string) {
  return apiPost<LoginResponse>('/login', { identifier, password });
}

export async function signupAPI(formData: FormData) {
  return apiPost<User>('/signup', formData);
}

export async function verifyUserAPI(username: string) {
  // Cache-busted: the GET cache would otherwise serve a stale answer to the
  // 10s session poll.
  return apiGet<{ exists: boolean }>(
    `/api/verify-user?username=${encodeURIComponent(username)}&t=${Date.now()}`,
  );
}

export async function checkDisabledAPI(username: string) {
  return apiGet<{ disabled: boolean }>(
    `/api/check-disabled?username=${encodeURIComponent(username)}&t=${Date.now()}`,
  );
}

export async function forgotPasswordAPI(identifier: string) {
  return apiPost<{ message: string; email: string }>('/forgot-password', { identifier });
}

export async function verifyResetCodeAPI(identifier: string, code: string) {
  return apiPost<{ message: string }>('/verify-reset-code', { identifier, code });
}

export async function resetPasswordAPI(identifier: string, code: string, newPassword: string) {
  return apiPost<{ message: string }>('/reset-password', { identifier, code, newPassword });
}

export async function getProfileAPI(username: string) {
  return apiGet<User>(`/profile/${encodeURIComponent(username)}`);
}

export async function updateProfileAPI(username: string, formData: FormData) {
  return apiPost<User>(`/profile/${encodeURIComponent(username)}/update`, formData);
}

export async function changePasswordAPI(username: string, currentPassword: string, newPassword: string) {
  return apiPost<{ success: boolean; message: string }>(`/profile/${encodeURIComponent(username)}/change-password`, {
    currentPassword,
    newPassword,
  });
}

export async function updateProfileTypeAPI(username: string, profileType: string) {
  return apiPost<{ profile_type: string }>(`/profile/${encodeURIComponent(username)}/update-type`, {
    profile_type: profileType,
  });
}

export async function updateNotificationPrefsAPI(username: string, prefs: any) {
  return apiPost<{ ok: boolean }>(`/profile/${encodeURIComponent(username)}/notification-prefs`, {
    notification_prefs: prefs,
  });
}

export async function deactivateAccountAPI(username: string) {
  return apiPost<{ ok: boolean }>('/deactivate-account', { username });
}

export async function getAccountStatsAPI(username: string) {
  return apiGet<{ mobcoins: number; rank: number | null }>(`/account-stats?username=${encodeURIComponent(username)}`);
}


