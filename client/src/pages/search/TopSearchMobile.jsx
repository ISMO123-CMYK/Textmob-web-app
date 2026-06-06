import MobilePageLayout from '../../components/layout/MobilePageLayout';
import SearchContent from './SearchContent';
export default function TopSearchMobile() { return <MobilePageLayout title="Search" onBack={() => window.history.back()}><SearchContent /></MobilePageLayout>; }
