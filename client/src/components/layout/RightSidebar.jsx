import TrendingTopics from './TrendingTopics';
import SuggestedUsers from './SuggestedUsers';

export default function RightSidebar() {
  return (
    <div className="flex flex-col">
      <TrendingTopics />
      <SuggestedUsers />
    </div>
  );
}
