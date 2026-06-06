import MobilePageLayout from '../../components/layout/MobilePageLayout';
import MakePostContent from './MakePostContent';
export default function MakePostMobile() { return <MobilePageLayout title="Create Post" onBack={() => window.history.back()}><MakePostContent /></MobilePageLayout>; }
