import { apiGet, apiPost } from './client';

export interface WalletData {
  mobcoins: number;
  fullname: string;
  username: string;
  profile_type: string;
}

export interface Payout {
  id: string;
  type: 'CASH' | 'AIRTIME';
  payout_details: any;
  status: 'COMPLETED' | 'REJECTED' | 'PENDING';
  coin_amount: number;
  naira_value: number;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  fullname: string;
  avatar: string;
  score: number;
  score7d: number;
  totalLikes: number;
  followersCount: number;
}

export async function getWalletAPI(userId: string) {
  return apiGet<WalletData>(`/t/wallet?userId=${encodeURIComponent(userId)}`);
}

export async function sendMobcoinsAPI(fromId: string, toIds: string[], amount: number, postId?: string) {
  return apiPost<{ success: boolean; message: string }>('/t/send-mobcoins', {
    fromId, toIds, amount, postId,
  });
}

export async function getPayoutsAPI(userId: string) {
  return apiGet<Payout[]>(`/api/user/payouts?userId=${encodeURIComponent(userId)}`);
}

export async function redeemAPI(userId: string, amount: number, type: string, details: any) {
  return apiPost<{ message: string }>('/api/redeem', {
    userId, amount, type, details,
  });
}

export async function getLeaderboardAPI() {
  return apiGet<{ success: boolean; leaderboard: LeaderboardEntry[] }>('/leaderboard');
}

export interface Transaction {
  id: string | number;
  type: 'credit' | 'debit';
  amount: number;
  description?: string;
  created_at: string;
}

export async function getBalanceAPI(username: string) {
  return apiGet<number>(`/balance?username=${encodeURIComponent(username)}`);
}

export async function getTransactionsAPI(username: string) {
  return apiGet<Transaction[]>(`/transactions?username=${encodeURIComponent(username)}`);
}

export async function tipPostAPI(username: string, amount: number, postId?: string) {
  return apiPost<{ ok: boolean }>('/tip', { username, amount, post_id: postId });
}
