export default function LogoutPage() {
  localStorage.removeItem('currentUser');
  window.location.href = '/auth';
  return null;
}
