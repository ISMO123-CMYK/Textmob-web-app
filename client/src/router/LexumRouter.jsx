import React from 'react';
import ReactDOM from 'react-dom/client';
import FeatureOnboarding from '../components/ui/FeatureOnboarding';

/**
 * LexumJS Router v1.2.5
 * Custom SPA router with history/hash mode and responsive route support.
 * Preserved from the original Textmob bundle.
 */
const Lexum = (() => {
  let routes = [];
  let rootEl = null;
  const version = '1.2.5';
  let routeMode = 'hash';
  let currentPath = null;
  let setRouteState = null;
  let pendingRoute = null;
  let loaderEl = null;
  let spinnerEl = null;
  let loaderTimeout = null;
  let loaderStart = 0;

  const cleanPath = (path = '/') =>
    String(path || '/').split('?')[0].split('#')[0] || '/';

  const getCurrentPath = () =>
    routeMode === 'hash'
      ? location.hash.slice(1) || '/'
      : `${location.pathname || '/'}${location.search || ''}`;

  const normalizePath = (path) => cleanPath(path);

  const ensureLoader = () => {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', ensureLoader, { once: true });
      return;
    }
    if (!loaderEl) {
      loaderEl = document.createElement('div');
      loaderEl.className = 'fixed inset-0 bg-white z-50 hidden flex items-center justify-center';
      document.body.appendChild(loaderEl);
      spinnerEl = document.createElement('div');
      spinnerEl.className = 'w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin';
      loaderEl.appendChild(spinnerEl);
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `;
      document.head.appendChild(style);
    }
  };

  const showLoader = (minDuration = 500) => {
    ensureLoader();
    clearTimeout(loaderTimeout);
    loaderEl.classList.remove('hidden');
    loaderStart = performance.now();
    loaderTimeout = setTimeout(() => {}, minDuration);
  };

  const hideLoader = () => {
    if (!loaderEl) return;
    const elapsed = performance.now() - (loaderStart || 0);
    const remaining = Math.max(0, 500 - elapsed);
    clearTimeout(loaderTimeout);
    setTimeout(() => { loaderEl.classList.add('hidden'); }, remaining);
  };

  const tryHideLoader = () => hideLoader();
  const ready = () => hideLoader();

  const logError = (msg, trace = '') => {
    console.error(`[LexumJS Error]: ${msg}`);
    if (trace) console.trace(trace);
  };

  const isMobile = () =>
    /android|iphone|ipad|ipod|windows phone|mobile/i.test(navigator.userAgent || '');

  const matchRoute = (path) => {
    for (const route of routes) {
      const routeSegments = (route.path || '/').split('/').filter(Boolean);
      const pathSegments = (path || '/').split('/').filter(Boolean);
      if (routeSegments.length !== pathSegments.length) continue;

      const params = {};
      let matched = true;

      for (let i = 0; i < routeSegments.length; i++) {
        const seg = routeSegments[i];
        const val = pathSegments[i];
        try {
          if (seg.startsWith(':')) {
            params[seg.slice(1)] = decodeURIComponent(val || '');
          } else if (seg.includes('(:') && seg.endsWith(')')) {
            const m = seg.match(/^(.*)\(:([^)]+)\)$/);
            if (m) {
              const prefix = m[1];
              const paramName = m[2];
              if ((val || '').startsWith(prefix)) {
                params[paramName] = decodeURIComponent((val || '').slice(prefix.length));
              } else { matched = false; break; }
            } else { matched = false; break; }
          } else if (seg !== val) {
            matched = false; break;
          }
        } catch {
          console.error('LexumJS: Invalid encoded segment', val);
          matched = false; break;
        }
      }

      if (!matched) continue;

      const component = route.responsive
        ? (isMobile() ? route.responsive.mobile : route.responsive.desktop)
        : route.component;

      return { component: React.memo(component), params, route };
    }
    return null;
  };

  // React context for route state
  const RouteContext = React.createContext({
    route: { component: null, params: {}, data: null },
    navigate: () => {},
  });

  // Route provider
  const RouteProvider = ({ children }) => {
    const [routeState, setRoute] = React.useState({ component: null, params: {}, data: null });

    React.useEffect(() => {
      setRouteState = setRoute;
      if (pendingRoute) {
        try { setRoute(pendingRoute); }
        finally { pendingRoute = null; }
      }
    }, []);

    return React.createElement(
      RouteContext.Provider,
      { value: { route: routeState, navigate } },
      children,
      React.createElement(FeatureOnboarding)
    );
  };

  // Route outlet with route component caching to prevent unmounting and re-fetching/skeletons on navigation
  const RouteOutlet = () => {
    const { route } = React.useContext(RouteContext);
    const [mountedPages, setMountedPages] = React.useState({});
    const activePath = getCurrentPath();

    React.useEffect(() => {
      if (route.component) {
        setMountedPages(prev => {
          return {
            ...prev,
            [activePath]: {
              component: route.component,
              params: route.params,
              data: route.data
            }
          };
        });
      }
    }, [route, activePath]);

    if (!route.component && Object.keys(mountedPages).length === 0) {
      return null;
    }

    return React.createElement(
      'div',
      { className: 'route-outlet-container w-full h-full' },
      Object.entries(mountedPages).map(([pathKey, page]) => {
        const isActive = pathKey === activePath;
        const isSnaps = pathKey === '/snaps' || pathKey.includes('/snaps');
        return React.createElement(
          'div',
          {
            key: pathKey,
            style: { display: isActive ? 'block' : 'none' },
            className: `route-page-wrapper w-full h-full ${isActive ? 'route-active' : ''} ${isSnaps ? 'snaps-context' : ''}`
          },
          React.createElement(page.component, {
            ...page.params,
            routeData: page.data
          })
        );
      })
    );
  };

  function navigate(path) {
    const safePath = encodeNavPath(path);
    if (safePath !== currentPath) {
      if (routeMode === 'history') {
        history.pushState({}, '', safePath);
        resolveRoute(safePath);
      } else {
        location.hash = safePath;
      }
    }
  }

  function specialnavigate(path) {
    const safePath = encodeNavPath(path);
    if (routeMode === 'history') {
      history.pushState({}, '', safePath);
      resolveRoute(safePath);
    } else {
      location.hash = safePath;
    }
  }

  // Percent-encode the pathname segments before pushing into history/hash.
  // Skips segments that are already percent-encoded so we never double-encode.
  // Preserves query strings (anything after '?').
  function encodeNavPath(path) {
    if (!path) return path;
    const str = String(path);
    const hasQuery = str.indexOf('?') !== -1;
    const base = hasQuery ? str.slice(0, str.indexOf('?')) : str;
    const query = hasQuery ? str.slice(str.indexOf('?')) : '';
    const encoded = base.split('/').map((seg) => {
      if (!seg) return seg;
      // Already percent-encoded? (decode returns something different) -> leave alone
      try {
        if (decodeURIComponent(seg) !== seg) return seg;
      } catch {
        // malformed % sequences (e.g. literal "%re") => treat as raw, encode below
      }
      // Safe unencoded path-segment characters (RFC 3986 unreserved + sub-delims)
      if (/^[a-zA-Z0-9@._~!$&'()*+,;=:-]+$/.test(seg)) return seg;
      try {
        // Preserve a leading '@' so the `/@(:username)` profile route still
        // matches after the username portion is percent-encoded.
        return seg.startsWith('@') ? `@${encodeURIComponent(seg.slice(1))}` : encodeURIComponent(seg);
      } catch { return seg; }
    }).join('/');
    return encoded + query;
  }

  const resolveRoute = async (path) => {
    const fullPath = path || getCurrentPath();
    if (fullPath === currentPath && !path) return;
    currentPath = fullPath;

    const clean = normalizePath(fullPath);
    const match = matchRoute(clean);
    if (!match) return logError(`No match for path: ${clean}`);

    const { component, params, route } = match;
    const preloadFn = (route && route.preload) || (component && component.preload);
    const hasPreload = !!preloadFn;

    try {
      if (hasPreload && typeof showLoader === 'function') showLoader();
      let data = null;
      if (preloadFn) {
        const result = preloadFn(params);
        data = result && typeof result.then === 'function' ? await result : result;
      }
      if (setRouteState) {
        setRouteState(() => ({ component, params, data }));
      } else {
        pendingRoute = { component, params, data };
      }
      requestAnimationFrame(() => tryHideLoader());
    } catch (e) {
      tryHideLoader();
      logError('Route preload failed', e);
    }
  };

  const bindLinks = () => {
    document.body.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        if (
          href &&
          (href.startsWith('/') || href.startsWith('#')) &&
          !href.endsWith('.html') &&
          !href.includes('.html') &&
          !link.hasAttribute('download') &&
          link.getAttribute('target') !== '_blank' &&
          !link.hasAttribute('data-no-lexum')
        ) {
          e.preventDefault();
          navigate(href);
        }
      }
    });
  };

  return {
    init: ({ root, routes: appRoutes, mode = 'hash', wrapper }) => {
      rootEl = document.getElementById(root);
      if (!rootEl) return logError(`Root '${root}' not found`);

      routeMode = mode === 'history' ? 'history' : 'hash';
      routes.push(...appRoutes);

      const outlet = React.createElement(RouteOutlet);
      const app = wrapper ? React.createElement(wrapper, null, outlet) : outlet;

      ReactDOM.createRoot(rootEl).render(React.createElement(RouteProvider, null, app));

      if (routeMode === 'hash') {
        window.addEventListener('hashchange', () => resolveRoute());
      } else {
        window.addEventListener('popstate', () => resolveRoute());
      }

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => resolveRoute(), 0);
      } else {
        window.addEventListener('load', () => setTimeout(() => resolveRoute(), 0), { once: true });
      }

      bindLinks();
      console.log(`LexumJS v${version} mounted in ${routeMode} mode`);
    },
    version,
    error: logError,
    navigate,
    specialnavigate,
    showLoader,
    tryHideLoader,
    ready,
    reload: () => window.location.reload(),
  };
})();

window.Lexum = Lexum;

export default Lexum;
