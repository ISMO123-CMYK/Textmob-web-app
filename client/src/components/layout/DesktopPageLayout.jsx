import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';

/**
 * Shared shell for secondary pages.
 * The home/feed layout stays on its existing dedicated shell.
 */
export default function DesktopPageLayout({ children, rightPanel = true }) {
  return (
    <div className="flex h-screen bg-[#F7F8FC] text-slate-900">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded border-r border-[#E7EAF2] bg-[#F7F8FC]">
        <div className="mx-auto min-h-full w-full max-w-[1240px]">
          {children}
        </div>
      </main>
      {rightPanel && (
        <aside className="hidden w-[333px] shrink-0 overflow-y-auto border-l border-[#E7EAF2] bg-white scrollbar-thin scrollbar-thumb-rounded xl:block">
          {rightPanel === true ? <RightSidebar /> : rightPanel}
        </aside>
      )}
    </div>
  );
}
