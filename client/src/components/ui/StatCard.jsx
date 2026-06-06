import { cn } from '../../utils/classNames';

export default function StatCard({ label, value, icon, accent = 'text-blue-600', sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-1',
        onClick ? 'cursor-pointer active:bg-gray-50 active:scale-[0.98] transition-colors' : ''
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
