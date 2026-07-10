import { useEffect } from 'react';

export default function AboutPage() {
  useEffect(() => {
    window.location.replace('/about.html');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
