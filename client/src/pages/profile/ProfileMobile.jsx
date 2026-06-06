import MobilePageLayout from '../../components/layout/MobilePageLayout';
import ProfileContent from './ProfileContent';
export default function ProfileMobile() { return <MobilePageLayout title="Profile" onBack={() => window.history.back()}><ProfileContent /></MobilePageLayout>; }
