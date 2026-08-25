import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import HomeFeed from '../home/HomeFeed';
import { PostSkeleton } from '../../components/ui/PostCard';

export default function LiveFeed() {
 const [streams, setStreams] = useState([]);
 const [error, setError] = useState(null);
 const [loading, setLoading] = useState(true);
 const currentUser = localStorage.getItem('currentUser') || '';

 const loadStreams = async () => {
 try {
 const res = await apiFetch(`/get-live-posts?username=${encodeURIComponent(currentUser)}`);
 if (!res.ok) throw new Error('Failed to load live posts');
 const data = await res.json();
 setStreams(Array.isArray(data) ? data : []);
 setError(null);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadStreams();
 const interval = setInterval(loadStreams, 60000);
 return () => clearInterval(interval);
 }, [currentUser]);

 if (loading) {
 return (
 <div className="flex flex-col w-full max-w-2xl mx-auto md:mt-4 bg-white md:rounded-2xl md:border border-gray-100 overflow-visible pb-20">
 {[0, 1].map(i => (
 <PostSkeleton key={i} />
 ))}
 </div>
 );
 }

 if (error) {
 return (
 <div className="p-6 text-center max-w-md mx-auto">
 <p className="text-sm text-red-500 mb-3">{error}</p>
 <button onClick={loadStreams} className="text-xs font-semibold text-blue-600 hover:underline">Try again</button>
 </div>
 );
 }

 if (streams.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center px-6 py-20 text-center max-w-md mx-auto animate-fade-in">
 <div className="relative mb-6">
 <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
 <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-500 fill-none stroke-current" strokeWidth="2">
 <circle cx="12" cy="12" r="10" />
 <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
 </svg>
 </div>
 <span className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping opacity-60" />
 </div>
 <h2 className="text-base font-bold text-gray-900 mb-1.5">No live streams right now</h2>
 <p className="text-xs text-gray-400 mb-6 max-w-[240px] leading-relaxed">
 Be the first to go live and get eyes on your content instantly.
 </p>
 <button
 onClick={() => window.Lexum?.navigate('/create-live')}
 className="flex items-center gap-2 h-10 px-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold active:scale-95 transition-all shadow-lg shadow-red-500/20"
 >
 <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
 Go Live · It's Free
 </button>
 </div>
 );
 }

 return <HomeFeed propPosts={streams} />;
}
