import CreateLiveContent from './CreateLiveContent';
import { LIVE_STREAMING_ENABLED } from '../../config/live';
import LiveComingSoon from './LiveComingSoon';
export default function CreateLiveMobile() { return LIVE_STREAMING_ENABLED ? <CreateLiveContent /> : <LiveComingSoon />; }
