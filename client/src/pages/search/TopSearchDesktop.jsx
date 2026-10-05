import DesktopPageLayout from '../../components/layout/DesktopPageLayout';
import TrendingTopics from '../../components/layout/TrendingTopics';
import SearchContent from './SearchContent';
export default function TopSearchDesktop() { return <DesktopPageLayout rightPanel={<TrendingTopics />}><SearchContent /></DesktopPageLayout>; }
