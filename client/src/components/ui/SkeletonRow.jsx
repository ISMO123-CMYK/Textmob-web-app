export default function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-3/5" />
        <div className="h-2 bg-gray-100 rounded-full w-2/5" />
      </div>
    </div>
  );
}
