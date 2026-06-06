import MobileNav from './MobileNav';

/**
 * Standard mobile page layout: Header | Content | MobileNav
 */
export default function MobilePageLayout({ title, children, onBack }) {
  return (
    <div className="relative min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center h-14 px-4 gap-3">
          {onBack && (
            <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900 flex-1 truncate">{title}</h1>
        </div>
      </header>
      <div>{children}</div>
      <MobileNav />
    </div>
  );
}
