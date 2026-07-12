import { useState, useEffect, useRef, Fragment } from 'react';
import { apiFetch } from '../../config/api';

export default function ActivityContent({ onClose }) {
  useEffect(() => { if (!localStorage.currentUser) { window.Lexum ? window.Lexum.navigate('/auth') : window.location.href = '/auth'; } }, []);
  const currentUser = localStorage.getItem('currentUser') || '';
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const originalListRef = useRef([]);
  const dropdownRefs = useRef({});

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (openMenuId === null) return;
      const currentDropdown = dropdownRefs.current[openMenuId];
      if (currentDropdown && !currentDropdown.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setShowConfirm(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  // Helper avatar fallback
  function getAvatarFallback(username) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'U')}&background=E6EEF8&color=1E3A8A&size=128&rounded=true`;
  }

  function processNotifications(list) {
    return (list || []).map(item => ({
      ...item,
      avatar: item.avatar || item.senderPic || item.sender_pic || getAvatarFallback(item.sender || item.username || 'User')
    }));
  }

  // Load notifications
  async function loadNotifications() {
    try {
      const res = await apiFetch(`/get-notifications?username=${encodeURIComponent(currentUser)}`);
      if (!res.ok) throw new Error('Failed to load');
      const rawData = await res.json();
      const processed = processNotifications(rawData).sort(
        (a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at)
      );
      originalListRef.current = processed;
      setNotifications(processed);
      setError(null);
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Delete single notification
  function deleteSingleNotification(id) {
    setOpenMenuId(null);
    const updated = originalListRef.current.filter(e => e.id !== id);
    originalListRef.current = updated;
    setNotifications([...updated]);
    
      apiFetch('/delete-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser,
            notificationId: id
          })
        }).catch(() => {});
  }

  function markAsRead(id) {
    if (!id) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    apiFetch('/mark-notification-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, notificationId: id })
    }).catch(() => {});
  }

  function navigateAndMark(item) {
    if (!item.link) return;
    if (!item.read) markAsRead(item.id);
    window.Lexum?.navigate(item.link);
  }

  // Clear all notifications (batch delete + live reload)
  async function clearAllNotifications() {
    setShowConfirm(false);
    setClearing(true);
    try {
      await apiFetch('/delete-all-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser })
      });
      originalListRef.current = [];
      setNotifications([]);
    } catch {}
    setClearing(false);
  }

  // Time formatter
  function formatTime(timestamp) {
    const timeDiff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(timeDiff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  // Type badge
  function TypeBadge({ type }) {
    const icon = {
      mobcoins: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875v4.5H3.375A1.875 1.875 0 0 1 1.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0 1 12 2.753a3.375 3.375 0 0 1 5.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 1 0-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3ZM11.25 12.75H3v6.75a2.25 2.25 0 0 0 2.25 2.25h6v-9ZM12.75 12.75v9h6.75a2.25 2.25 0 0 0 2.25-2.25v-6.75h-9Z" />
        </svg>
      ),
      likes: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ),
      like: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ),
      comments: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M4.913 2.658C2.335 3.233 0 5.423 0 8.364c0 1.688.754 3.2 1.956 4.272l-1.05 2.33a.75.75 0 001.004.966l2.995-1.498c.718.22 1.49.332 2.282.332.194 0 .387-.008.579-.02.268-1.113.99-2.02 1.883-2.474-.19-.524-.302-1.09-.302-1.679 0-2.412 1.509-4.48 3.665-5.458a7.75 7.75 0 00-3.23-1.035C8.627.97 6.495.47 4.913 2.658z" />
        </svg>
      ),
      comment: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M4.913 2.658C2.335 3.233 0 5.423 0 8.364c0 1.688.754 3.2 1.956 4.272l-1.05 2.33a.75.75 0 001.004.966l2.995-1.498c.718.22 1.49.332 2.282.332.194 0 .387-.008.579-.02.268-1.113.99-2.02 1.883-2.474-.19-.524-.302-1.09-.302-1.679 0-2.412 1.509-4.48 3.665-5.458a7.75 7.75 0 00-3.23-1.035C8.627.97 6.495.47 4.913 2.658z" />
        </svg>
      ),
      mentions: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      mention: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      followers: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M6.75 8.25a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM3 20.25a6.75 6.75 0 0113.5 0H3z" />
          <path d="M18.75 9a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM21 20.25a3.75 3.75 0 00-6.75-2.183" />
        </svg>
      ),
      follow: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M6.75 8.25a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM3 20.25a6.75 6.75 0 0113.5 0H3z" />
          <path d="M18.75 9a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM21 20.25a3.75 3.75 0 00-6.75-2.183" />
        </svg>
      ),
      connection: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      ),
      newPost: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      group: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      events: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      verification: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      textmobai: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      ),
      askify: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      ),
      system: (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current">
          <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    }[type];

    if (icon) {
      const color = {
        mobcoins: 'bg-amber-100 text-amber-600',
        likes: 'bg-red-100 text-red-500',
        like: 'bg-red-100 text-red-500',
        comments: 'bg-blue-100 text-blue-500',
        comment: 'bg-blue-100 text-blue-500',
        mentions: 'bg-purple-100 text-purple-500',
        mention: 'bg-purple-100 text-purple-500',
        followers: 'bg-green-100 text-green-500',
        follow: 'bg-green-100 text-green-500',
        connection: 'bg-orange-100 text-orange-500',
        newPost: 'bg-indigo-100 text-indigo-500',
        group: 'bg-teal-100 text-teal-500',
        events: 'bg-pink-100 text-pink-500',
        verification: 'bg-cyan-100 text-cyan-500',
        textmobai: 'bg-violet-100 text-violet-500',
        askify: 'bg-slate-100 text-slate-600',
        system: 'bg-gray-100 text-gray-500',
      }[type] || 'bg-gray-100 text-gray-500';
      return (
        <span className={`w-4 h-4 rounded-full ${color} flex items-center justify-center`}>
          {icon}
        </span>
      );
    }

    return null;
  }

  // Close Button component
  function CloseButton({ onClick, size = 'w-8 h-8' }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${size} rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-colors`}
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    );
  }

  // Skeleton Loader
  function SkeletonRow() {
    return (
      <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2 pt-1 animate-pulse">
          <div className="h-3 bg-gray-100 rounded-full w-3/4" />
          <div className="h-2 bg-gray-100 rounded-full w-1/3" />
        </div>
      </div>
    );
  }

  // Options Dropdown
  function OptionsDropdown({ item }) {
    const isOpen = openMenuId === item.id;
    return (
      <div className="relative flex-shrink-0" ref={el => dropdownRefs.current[item.id] = el}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId(isOpen ? null : item.id);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
            isOpen ? 'bg-gray-100 text-gray-700' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-50'
          }`}
          aria-label="More options"
          aria-expanded={isOpen}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>
        {isOpen && (
          <div
            className="absolute right-0 top-9 z-30 w-40 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-lg shadow-black/5"
            onClick={e => e.stopPropagation()}
          >
            {item.link && (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 transition-colors text-left font-semibold"
                onClick={() => {
                  setOpenMenuId(null);
                  navigateAndMark(item);
                }}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open
              </button>
            )}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-left font-semibold"
              onClick={() => deleteSingleNotification(item.id)}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  // Individual Notification Row
  function NotificationRow({ item }) {
    const type = item.type || '';
    const typeInfo = {
      mobcoins: { ring: 'ring-2 ring-amber-200', bg: 'bg-amber-50/30', text: 'text-amber-900' },
      likes: { ring: 'ring-1 ring-red-200', bg: 'bg-red-50/30', text: 'text-gray-800' },
      like: { ring: 'ring-1 ring-red-200', bg: 'bg-red-50/30', text: 'text-gray-800' },
      comments: { ring: 'ring-1 ring-blue-200', bg: 'bg-blue-50/30', text: 'text-gray-800' },
      comment: { ring: 'ring-1 ring-blue-200', bg: 'bg-blue-50/30', text: 'text-gray-800' },
      mentions: { ring: 'ring-1 ring-purple-200', bg: 'bg-purple-50/30', text: 'text-gray-800' },
      mention: { ring: 'ring-1 ring-purple-200', bg: 'bg-purple-50/30', text: 'text-gray-800' },
      followers: { ring: 'ring-1 ring-green-200', bg: 'bg-green-50/30', text: 'text-gray-800' },
      follow: { ring: 'ring-1 ring-green-200', bg: 'bg-green-50/30', text: 'text-gray-800' },
      connection: { ring: 'ring-1 ring-orange-200', bg: 'bg-orange-50/30', text: 'text-gray-800' },
      newPost: { ring: 'ring-1 ring-indigo-200', bg: 'bg-indigo-50/30', text: 'text-gray-800' },
      group: { ring: 'ring-1 ring-teal-200', bg: 'bg-teal-50/30', text: 'text-gray-800' },
      events: { ring: 'ring-1 ring-pink-200', bg: 'bg-pink-50/30', text: 'text-gray-800' },
      verification: { ring: 'ring-1 ring-cyan-200', bg: 'bg-cyan-50/30', text: 'text-gray-800' },
      textmobai: { ring: 'ring-1 ring-violet-200', bg: 'bg-violet-50/30', text: 'text-gray-800' },
      askify: { ring: 'ring-1 ring-slate-200', bg: 'bg-slate-50/30', text: 'text-gray-800' },
    };
    const info = typeInfo[type] || { ring: 'border border-gray-100', bg: '', text: 'text-gray-800' };
    const showChip = item.link &&
      item.link !== '/' &&
      !item.link.startsWith('/@') &&
      !item.link.startsWith('/accountscenter') &&
      !item.link.startsWith('/wallet');
    return (
      <li
        className={`relative flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 active:bg-gray-50/50 transition-colors cursor-pointer ${
          item.read ? '' : 'border-l-2 border-l-blue-500 pl-3.5'
        } ${!item.read && info.bg ? info.bg : ''}`}
        onClick={() => navigateAndMark(item)}
      >
        <div className="relative flex-shrink-0">
          <img src={item.avatar} alt={item.sender || 'user'} className={`w-10 h-10 rounded-full object-cover ${info.ring}`} />
          <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm">
            <TypeBadge type={item.type} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-snug ${info.text}`}
            dangerouslySetInnerHTML={{ __html: item.message }}
          />
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-xs text-gray-400 font-medium">{formatTime(item.timestamp || item.created_at)}</p>
            {showChip && (
              <a
                href={item.link}
                onClick={e => { e.stopPropagation(); navigateAndMark(item); }}
                className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-2 py-0.5 rounded-full transition-colors"
              >
                View post →
              </a>
            )}
          </div>
        </div>
        {!item.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
        <OptionsDropdown item={item} />
      </li>
    );
  }

  const unreadCount = notifications.filter(e => !e.read).length;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white min-h-screen flex flex-col font-sans antialiased">
      {/* Header Sticky section */}
      <div className="sticky top-14 md:top-0 bg-white z-10 border-b border-gray-100 shadow-sm shadow-black/[0.01]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="hidden md:block">
            <h1 className="text-base font-extrabold text-gray-900 leading-tight">Notifications</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              {loading
                ? 'Loading…'
                : notifications.length === 0
                ? 'All caught up'
                : `${notifications.length} notification${notifications.length === 1 ? '' : 's'}${
                    unreadCount > 0 ? ` · ${unreadCount} unread` : ''
                  }`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {notifications.length > 0 && !clearing && (
              <button
                onClick={() => setShowConfirm(true)}
                className="h-8 px-3 rounded-full text-xs font-bold text-red-500 hover:bg-red-50 active:scale-95 transition-all"
              >
                Clear all
              </button>
            )}
            {clearing && <span className="text-xs text-gray-400 px-2 font-semibold">Clearing…</span>}
            {onClose && <CloseButton onClick={onClose} />}
          </div>
        </div>
        
        {/* Confirm Clear Banner */}
        {showConfirm && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border-t border-red-100 animate-slide-in">
            <p className="text-xs text-red-600 font-bold">
              Delete all {notifications.length} notifications?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="h-7 px-3 rounded-full text-xs font-bold text-gray-600 bg-white border border-gray-200 active:scale-95 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllNotifications}
                className="h-7 px-3 rounded-full text-xs font-bold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-colors shadow-sm shadow-red-500/10"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main notifications list scroll wrapper */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <Fragment>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </Fragment>
        ) : error ? (
          <div className="px-4 py-12 flex flex-col items-center gap-2 text-center max-w-sm mx-auto">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-400 fill-none stroke-current" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm text-gray-500 font-semibold">{error}</p>
            <button
              onClick={loadNotifications}
              className="mt-2 h-8 px-4 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-colors shadow-md shadow-blue-500/15"
            >
              Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-24 flex flex-col items-center gap-3 text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-1">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-300 fill-none stroke-current" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-700">You're all caught up</h2>
            <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">New activity and interactions will show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 list-none m-0 p-0">
            {notifications.map(item => (
              <NotificationRow item={item} key={item.id} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
