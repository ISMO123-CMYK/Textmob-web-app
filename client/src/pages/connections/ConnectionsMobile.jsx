import MobilePageLayout from '../../components/layout/MobilePageLayout';
import ConnectionsContent from './ConnectionsContent';
export default function ConnectionsMobile() {
  return <MobilePageLayout title="Connections" onBack={() => window.history.back()}><ConnectionsContent /></MobilePageLayout>;
}
