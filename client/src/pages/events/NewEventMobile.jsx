import MobilePageLayout from '../../components/layout/MobilePageLayout';
import NewEventContent from './NewEventContent';
export default function NewEventMobile() { return <MobilePageLayout title="Create Event" onBack={() => window.history.back()}><NewEventContent /></MobilePageLayout>; }
