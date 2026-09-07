import MobileHeader from '../../components/layout/MobileHeader';
import MobileNav from '../../components/layout/MobileNav';
import SavedPostsFeed from './SavedPostsFeed';

export default function SavedPostsMobile() {
  return (
    <div className="relative min-h-screen pb-20 pt-[56px] bg-gray-100">
      <div className="fixed top-0 left-0 right-0 z-40">
        <MobileHeader />
      </div>
      <SavedPostsFeed />
      <MobileNav />
    </div>
  );
}
