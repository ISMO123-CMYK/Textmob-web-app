import { clearLoudaSession } from '../bridge/connector.js';

export default function LogoutPage() {
  localStorage.removeItem('currentUser');
  clearLoudaSession();
  window.location.href = '/auth';
  return null;
}
