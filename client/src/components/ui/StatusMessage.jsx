import { cn } from '../../utils/classNames';

export default function StatusMessage({ msg }) {
  if (!msg) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs px-3 py-2 rounded-xl',
        msg.ok
          ? 'bg-green-50 border border-green-100 text-green-600'
          : 'bg-red-50 border border-red-100 text-red-600'
      )}
    >
      {msg.ok ? (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {msg.text}
    </div>
  );
}
