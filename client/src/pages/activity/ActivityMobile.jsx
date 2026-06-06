import MobilePageLayout from '../../components/layout/MobilePageLayout';
import ActivityContent from './ActivityContent';
export default function ActivityMobile() {
  return <MobilePageLayout title="Activity" onBack={() => window.history.back()}><ActivityContent /></MobilePageLayout>;
}
