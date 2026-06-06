import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';

export default function StoriesPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const username = localStorage.getItem('currentUser') || '';

  useEffect(() => {
    apiFetch(`/get-sparks?username=${encodeURIComponent(username)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setStories(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-black"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>;
  if (stories.length === 0) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-black text-white text-center p-6">
      <div><p className="text-lg font-bold mb-2">No stories</p><p className="text-sm text-gray-400">Stories from people you follow will appear here</p>
        <button onClick={() => window.history.back()} className="mt-6 px-6 py-2.5 bg-white/10 border border-white/20 rounded-full text-sm font-bold hover:bg-white/20 transition-colors">Go Back</button>
      </div>
    </div>
  );

  const story = stories[activeIndex] || {};

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {story.media?.[0] && (
        /\.(mp4|mov|webm)/i.test(story.media[0]) ? <video src={story.media[0]} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline /> : <img src={story.media[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-20">
        {stories.map((_, i) => <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30"><div className={`h-full bg-white ${i <= activeIndex ? 'w-full' : 'w-0'}`} /></div>)}
      </div>
      <div className="absolute top-8 left-4 z-20 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{(story.username||'?')[0].toUpperCase()}</div>
        <span className="text-white text-sm font-bold">@{story.username}</span>
      </div>
      <button onClick={() => window.history.back()} className="absolute top-8 right-4 z-20 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      {story.text && <div className="absolute bottom-8 left-4 right-4 z-20"><p className="text-white text-sm font-medium">{story.text}</p></div>}
      <button onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
      <button onClick={() => activeIndex < stories.length - 1 ? setActiveIndex(activeIndex + 1) : window.history.back()} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" />
    </div>
  );
}
