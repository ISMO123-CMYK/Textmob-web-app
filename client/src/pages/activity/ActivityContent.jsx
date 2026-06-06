import { useState, useEffect, useRef, Fragment } from 'react';
import { apiFetch } from '../../config/api';

export default function ActivityContent({ onClose }) {
  const currentUser = localStorage.getItem('currentUser') || '';
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  const originalListRef = useRef([]);
  const dropdownRefs = useRef({});
  const markReadDone = useRef(false);

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
    return list.map(item => ({
      ...item,
      avatar: item.avatar || item.senderPic || item.sender_pic || getAvatarFallback(item.username || item.sender)
    }));
  }

  // Mark notifications as read
  async function markAllAsRead(list) {
    if (markReadDone.current) return;
    markReadDone.current = true;
    const unread = list.filter(e => !e.read);
    for (let t of unread) {
      try {
        await apiFetch('/mark-notification-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser,
            notificationId: t.id
          })
        });
      } catch {}
    }
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
      markAllAsRead(processed);
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

  // Clear all notifications
  async function clearAllNotifications() {
    setShowConfirm(false);
    setClearing(true);
    const listToClear = [...originalListRef.current];
    for (let item of listToClear) {
      try {
        await apiFetch('/delete-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser,
            notificationId: item.id
          })
        });
      } catch {}
      originalListRef.current = originalListRef.current.filter(e => e.id !== item.id);
      setNotifications([...originalListRef.current]);
    }
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

  // Type badge color dot
  function TypeDot({ type }) {
    const color = {
      like: 'bg-red-400',
      comment: 'bg-blue-400',
      follow: 'bg-green-400',
      mention: 'bg-purple-400',
      system: 'bg-gray-400'
    }[type] || 'bg-gray-300';
    return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
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
                  window.Lexum?.navigate(item.link);
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
    return (
      <li
        className={`relative flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 active:bg-gray-50/50 transition-colors cursor-pointer ${
          item.read ? '' : 'border-l-2 border-l-blue-500 pl-3.5'
        }`}
        onClick={() => {
          if (item.link) {
            window.Lexum?.navigate(item.link);
          }
        }}
      >
        <div className="relative flex-shrink-0">
          <img src={item.avatar} alt={item.username || 'user'} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
          <span className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm">
            <TypeDot type={item.type} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-snug text-gray-800`}
            dangerouslySetInnerHTML={{ __html: item.message }}
          />
          <p className="text-xs text-gray-400 mt-1 font-medium">{formatTime(item.timestamp || item.created_at)}</p>
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
