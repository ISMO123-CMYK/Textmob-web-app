export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:5000' 
  : 'https://textmob-provider-api-99ii.onrender.com';

export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  return fetch(url, options);
}

export function getCurrentUser() {
  return localStorage.getItem('currentUser') || '';
}

export function getChart() {
  return typeof window !== 'undefined' && window.Chart ? window.Chart : null;
}
