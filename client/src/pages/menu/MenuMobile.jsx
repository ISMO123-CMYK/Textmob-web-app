import MobilePageLayout from '../../components/layout/MobilePageLayout';
import MenuContent from './MenuContent';
export default function MenuMobile() { return <MobilePageLayout title="Menu" onBack={() => window.history.back()}><MenuContent /></MobilePageLayout>; }
