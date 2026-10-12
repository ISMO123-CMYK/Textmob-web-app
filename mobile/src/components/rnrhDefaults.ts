import { defaultFallbackFonts, defaultSystemFonts } from 'react-native-render-html';
import type { TRenderEngineConfig } from 'react-native-render-html';

// react-native-render-html attaches its configuration defaults through
// `TRenderEngineProvider.defaultProps`. React 19 removed support for
// `defaultProps` on function components, so those defaults are silently
// dropped and the transient render engine falls back to its own much weaker
// defaults (most notably `enableUserAgentStyles: false`).
//
// The visible symptom is that anything the *browser* would style for us —
// `<b>`, `<i>`, `<u>`, `<del>`, `<h1>`, `<h5>`, `<h6>`, `<pre>`, list marker
// metrics, inline `style="..."` — renders as plain text on native while the
// same post looks correct on the web. Every `<RenderHTML>` in the app must
// spread these props back in.
//
// NOTE: the objects below are module-level constants on purpose — the engine
// memoizes on their identity, so returning fresh literals from a component
// would rebuild the whole parse tree on every render.
export const rnrhDefaultProps: TRenderEngineConfig = {
  enableUserAgentStyles: true,
  enableCSSInlineProcessing: true,
  emSize: 14,
  htmlParserOptions: { decodeEntities: true },
  baseStyle: { fontSize: 14 },
  tagsStyles: {},
  classesStyles: {},
  idsStyles: {},
  ignoredDomTags: [],
  ignoredStyles: [],
  customHTMLElementModels: {},
  systemFonts: defaultSystemFonts,
  fallbackFonts: defaultFallbackFonts,
};
