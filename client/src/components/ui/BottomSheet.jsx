import { cn } from '../../utils/classNames';

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function Overlay({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-40"
      onClick={onClose}
      aria-hidden="true"
      style={{ backdropFilter: 'blur(8px) saturate(150%)', WebkitBackdropFilter: 'blur(8px) saturate(150%)' }}
    />
  );
}

export default function BottomSheet({ open, onClose, title, children, wide }) {
  if (!open) return null;

  return (
    <>
      <Overlay onClose={onClose} />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 flex flex-col',
          'md:inset-0 md:m-auto md:rounded-2xl md:h-fit',
          wide ? 'md:max-w-2xl' : 'md:max-w-sm'
        )}
      >
        <div className="md:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-8 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <CloseButton onClick={onClose} />
        </div>
        <div className="overflow-y-auto max-h-[80vh] md:max-h-[75vh]">{children}</div>
      </div>
    </>
  );
}

