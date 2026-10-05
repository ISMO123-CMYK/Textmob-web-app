// Live streaming is temporarily offline while it's rebuilt.
// One switch gates every live entry point: the create menu, the home
// Feed/Live switch, the LiveView/CreateLive screens and the server
// endpoints all read the same flag (server.js LIVE_STREAMING_ENABLED).
// Flip it back to true to restore everything exactly as it was.
export const LIVE_STREAMING_ENABLED = false;

export const LIVE_SOON_BADGE = 'Coming soon';
export const LIVE_SOON_TITLE = 'Live streaming is currently in building progress';
export const LIVE_SOON_BODY = "We're putting live back together. It'll be back soon.";
