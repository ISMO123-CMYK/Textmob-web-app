import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchGiphStickers } from '../../utils/stickerUtils';

export default function StickerPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);
  const abortRef = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(timeoutRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    timeoutRef.current = setTimeout(async () => {
      const data = await searchGiphStickers(q, controller.signal);
      if (data !== null) setResults(data);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    search(query);
    return () => { clearTimeout(timeoutRef.current); if (abortRef.current) abortRef.current.abort(); };
  }, [query, search]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSelect = (url) => { onSelect(url); onClose(); };

  const panel = (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center sm:justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      {/* Mobile: bottom sheet | Desktop: centered modal */}
      <div
        className="bg-white sm:rounded-2xl shadow-2xl w-full sm:w-96 max-h-[70vh] sm:max-h-[60vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 flex-shrink-0 fill-none stroke-current" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input
            type="text"
            autoFocus
            placeholder="Search stickers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto p-2 grid grid-cols-3 gap-1.5 flex-1">
          {loading && results.length === 0 && (
            <div className="col-span-3 py-10 text-center text-xs text-gray-400">Searching...</div>
          )}
          {!query && !loading && results.length === 0 && (
            <div className="col-span-3 py-10 text-center text-xs text-gray-400">Search for stickers</div>
          )}
          {results.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => handleSelect(sticker.url)}
              className="rounded-xl overflow-hidden aspect-square bg-gray-100 active:scale-95 transition-transform hover:scale-105"
            >
              <img src={sticker.url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
