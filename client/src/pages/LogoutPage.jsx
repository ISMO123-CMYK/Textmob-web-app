export default function LogoutPage() {
  localStorage.removeItem('currentUser');
  window.Lexum?.navigate('/auth');
  return null;
}
