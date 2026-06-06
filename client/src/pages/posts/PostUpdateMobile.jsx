import MobilePageLayout from '../../components/layout/MobilePageLayout';
import PostUpdateContent from './PostUpdateContent';
export default function PostUpdateMobile() { return <MobilePageLayout title="Edit Post" onBack={() => window.history.back()}><PostUpdateContent /></MobilePageLayout>; }
