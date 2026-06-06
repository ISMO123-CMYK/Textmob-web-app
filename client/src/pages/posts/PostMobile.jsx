import MobilePageLayout from '../../components/layout/MobilePageLayout';
import PostContent from './PostContent';
export default function PostMobile() { return <MobilePageLayout title="Post" onBack={() => window.history.back()}><PostContent /></MobilePageLayout>; }
