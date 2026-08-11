export default function AuthSideBranding() {
  return (
    <div className="hidden lg:flex flex-col justify-center flex-1 max-w-sm pr-8">
      <div className="mb-8">
        <span className="text-5xl font-black tracking-tighter text-blue-600 leading-none select-none">
          t<span className="text-blue-400">..</span>
        </span>
        <p className="text-2xl font-bold text-gray-900 mt-3 leading-tight">
          Nigeria's home for<br />real conversations.
        </p>
        <p className="text-sm text-gray-500 mt-2">Join thousands sharing what matters most.</p>
      </div>
      <div className="flex flex-col gap-3">
        {[
          { emoji: '', text: 'Trending topics in real-time' },
          { emoji: '', text: 'Instant messaging and snaps' },
          { emoji: '', text: 'Connect with your community' },
          { emoji: '', text: 'Live streaming to your crew in realtime' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl">
            <span className="text-lg">{item.emoji}</span>
            <span className="text-sm font-medium text-gray-700">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
