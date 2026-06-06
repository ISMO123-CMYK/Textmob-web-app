import MobilePageLayout from '../../components/layout/MobilePageLayout';
import EventsContent from './EventsContent';
export default function EventsMobile() { return <MobilePageLayout title="Events" onBack={() => window.history.back()}><EventsContent /></MobilePageLayout>; }
