import LiveContent from './LiveContent';
import { LIVE_STREAMING_ENABLED } from '../../config/live';
import LiveComingSoon from './LiveComingSoon';
export default function LiveViewMobile() { return LIVE_STREAMING_ENABLED ? <LiveContent /> : <LiveComingSoon />; }
