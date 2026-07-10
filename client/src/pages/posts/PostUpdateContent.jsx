import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';

export default function PostUpdateContent() {
  useEffect(() => { if (!localStorage.currentUser) { window.Lexum ? window.Lexum.navigate('/auth') : window.location.href = '/auth'; } }, []);
  const [post, setPost] = useState(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const username = localStorage.getItem('currentUser') || '';
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id') || '';

  useEffect(() => {
    if (postId) {
      apiFetch(`/get-post?id=${encodeURIComponent(postId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) { setPost(d); setText(d.text || ''); setTitle(d.title || ''); } setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [postId]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch('/edit-post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, username, text, title }) });
      window.Lexum?.navigate(`/post/${postId}`);
    } catch {} finally { setSaving(false); }
  }

  if (loading) return <div className="p-6"><div className="h-40 bg-gray-50 rounded-2xl animate-pulse" /></div>;

  return (
    <div>
      <div className="sticky top-14 md:top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 h-14 flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-black text-gray-900">Edit Post</h1>
        <button onClick={handleSave} disabled={saving} className="ml-auto md:ml-0 px-5 py-2 bg-blue-600 text-white rounded-full text-xs font-bold disabled:opacity-50 active:scale-95 transition-all">{saving ? 'Saving...' : 'Save'}</button>
      </div>
      <div className="p-4 lg:p-6 max-w-xl space-y-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-400" />
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:border-blue-400" />
      </div>
    </div>
  );
}
