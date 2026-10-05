import { LIVE_SOON_BADGE, LIVE_SOON_TITLE, LIVE_SOON_BODY } from '../../config/live';

// Placeholder shown anywhere live streaming used to be reachable
// (feed switch, /live/:postId, /create-live). Original screens stay intact.
export default function LiveComingSoon() {
  return (
    <div className="flex items-center justify-center px-6 py-14">
      <div className="max-w-md w-full text-center bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{LIVE_SOON_TITLE}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{LIVE_SOON_BODY}</p>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{LIVE_SOON_BADGE}</p>
      </div>
    </div>
  );
}
