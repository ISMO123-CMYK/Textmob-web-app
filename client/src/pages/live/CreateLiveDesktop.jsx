import DesktopPageLayout from '../../components/layout/DesktopPageLayout';
import CreateLiveContent from './CreateLiveContent';
import { LIVE_STREAMING_ENABLED } from '../../config/live';
import LiveComingSoon from './LiveComingSoon';
export default function CreateLiveDesktop() {
  return (
    <DesktopPageLayout rightPanel={false}>
      {LIVE_STREAMING_ENABLED ? <CreateLiveContent /> : <LiveComingSoon />}
    </DesktopPageLayout>
  );
}
