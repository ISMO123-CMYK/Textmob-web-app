import DesktopPageLayout from '../../components/layout/DesktopPageLayout';
import LoudaChatContent from './LoudaChatContent';

export default function LoudaChatDesktop() {
  return (
    <DesktopPageLayout rightPanel={false}>
      {/* Louda owns its internal scroll — lock the column to viewport height */}
      <div className="h-screen overflow-hidden">
        <LoudaChatContent />
      </div>
    </DesktopPageLayout>
  );
}
