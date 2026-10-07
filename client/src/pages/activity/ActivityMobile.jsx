import MobilePageLayout from '../../components/layout/MobilePageLayout';
import ActivityContent from './ActivityContent';
export default function ActivityMobile() {
  return <MobilePageLayout title="Notifications" onBack={() => window.history.back()}><ActivityContent /></MobilePageLayout>;
}
