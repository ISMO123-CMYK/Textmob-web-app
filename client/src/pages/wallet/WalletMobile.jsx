import MobilePageLayout from '../../components/layout/MobilePageLayout';
import WalletContent from './WalletContent';
export default function WalletMobile() { return <MobilePageLayout title="Wallet" onBack={() => window.history.back()}><WalletContent /></MobilePageLayout>; }
