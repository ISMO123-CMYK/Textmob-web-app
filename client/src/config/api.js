const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:5000' 
  : 'https://textmob-provider-api-99ii.onrender.com';

async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  return fetch(url, options);
}

function getCurrentUser() {
  return localStorage.getItem('currentUser') || '';
}

function getChart() {
  return typeof window !== 'undefined' && window.Chart ? window.Chart : null;
}

export {
  API_BASE_URL,
  apiFetch,
  getCurrentUser,
  getChart
};
