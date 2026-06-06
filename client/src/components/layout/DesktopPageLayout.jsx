import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';

/**
 * Standard desktop page layout: Sidebar | Content | Optional Right Panel
 */
export default function DesktopPageLayout({ children, rightPanel = true }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded border-r border-gray-200">
        {children}
      </div>
      {rightPanel && (
        <aside className="w-80 bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-rounded border-l border-gray-200">
          {rightPanel === true ? <RightSidebar /> : rightPanel}
        </aside>
      )}
    </div>
  );
}
