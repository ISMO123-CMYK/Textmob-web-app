import { useEffect } from 'react';

export default function NotificationToast({ title, message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const borderColors = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
  };

  const icons = {
    success: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    error: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };

  return (
    <div
      className={`fixed top-4 right-4 w-[340px] bg-white border border-gray-100 border-l-4 ${borderColors[type] || borderColors.info} rounded-2xl px-4 py-3 flex items-start gap-3`}
      style={{ zIndex: 9999 }}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type] || icons.info}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-tight">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-colors flex-shrink-0"
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
