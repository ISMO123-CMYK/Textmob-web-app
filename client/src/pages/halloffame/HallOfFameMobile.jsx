import MobilePageLayout from '../../components/layout/MobilePageLayout';
import HallOfFameContent from './HallOfFameContent';
export default function HallOfFameMobile() { return <MobilePageLayout title="Hall of Fame" onBack={() => window.history.back()}><HallOfFameContent /></MobilePageLayout>; }
