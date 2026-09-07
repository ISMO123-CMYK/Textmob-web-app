import Sidebar from '../../components/layout/Sidebar';
import RightSidebar from '../../components/layout/RightSidebar';
import DesktopHeader from '../../components/layout/DesktopHeader';
import SavedPostsFeed from './SavedPostsFeed';

export default function SavedPostsDesktop() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded border-r border-gray-200 flex flex-col h-full">
        <DesktopHeader />
        <SavedPostsFeed />
      </div>
      <aside className="w-80 bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-rounded border-l border-gray-200">
        <RightSidebar />
      </aside>
    </div>
  );
}
