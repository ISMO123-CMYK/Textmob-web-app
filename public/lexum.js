/* lexum.js - single-file router (compat + animated rounded loader + single React mount) */
window.Lexum = (() => {
  const routes = [];
  let root = null;
  const version = "1.2.4"; // Updated version
  let mode = "hash";

  // Router state
  let currentPath = null;
  let routeUpdate = null;
  let pendingRoute = null;

  // Loader elements & timers
  let loaderOverlay = null;
  let loaderSpinner = null;
  let loaderText = null;
  let minShowTimer = null;
  let loaderShownAt = 0;

  // Robust loader creator
  const createLoader = () => {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", createLoader, { once: true });
      return;
    }

    if (loaderOverlay && loaderSpinner) return;

    if (!loaderOverlay) {
      loaderOverlay = document.createElement("div");
      loaderOverlay.className = "fixed inset-0 bg-white z-50 hidden flex items-center justify-center";
      document.body.appendChild(loaderOverlay);

      // Create spinner
      loaderSpinner = document.createElement("div");
      loaderSpinner.className = "w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin";
      loaderOverlay.appendChild(loaderSpinner);

      // Add CSS for spinner animation
      const style = document.createElement("style");
      style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }
  };

  // Show loader
  const showLoader = (minMs = 500) => {
    createLoader();

    clearTimeout(minShowTimer);

    loaderOverlay.classList.remove("hidden");
    loaderShownAt = performance.now();

    minShowTimer = setTimeout(() => {}, minMs);
  };

  // Hide loader
  const hideLoaderInternal = () => {
    if (!loaderOverlay) return;

    const elapsed = performance.now() - (loaderShownAt || 0);
    const remaining = Math.max(0, 500 - elapsed);

    clearTimeout(minShowTimer);

    setTimeout(() => {
      loaderOverlay.classList.add("hidden");
    }, remaining);
  };

  // Backwards-compatible aliases
  const tryHideLoader = () => hideLoaderInternal();
  const ready = () => hideLoaderInternal();

  // Error reporting
  const error = (msg, trace = "") => {
    console.error(`[LexumJS Error]: ${msg}`);
    if (trace) console.trace(trace);
  };

  const isMobile = () => /android|iphone|ipad|ipod|windows phone|mobile/i.test(navigator.userAgent || "");

  const getPath = () => (mode === "hash" ? location.hash.slice(1) || "/" : location.pathname || "/");

  // Route matching
  const matchRoute = (path) => {
    for (const route of routes) {
      const rp = (route.path || "/").split("/").filter(Boolean);
      const pp = (path || "/").split("/").filter(Boolean);

      if (rp.length !== pp.length) continue;

      const params = {};
      let ok = true;

      for (let i = 0; i < rp.length; i++) {
        const routeSegment = rp[i];
        const pathSegment = pp[i];

        try {
          if (routeSegment.startsWith(":")) {
            params[routeSegment.slice(1)] = decodeURIComponent(pathSegment || "");
          } else if (routeSegment.includes("(:") && routeSegment.endsWith(")")) {
            const m = routeSegment.match(/^(.*)\(:([^)]+)\)$/);
            if (m) {
              const prefix = m[1];
              const paramName = m[2];
              if ((pathSegment || "").startsWith(prefix)) {
                params[paramName] = decodeURIComponent((pathSegment || "").slice(prefix.length));
              } else {
                ok = false;
                break;
              }
            } else {
              ok = false;
              break;
            }
          } else if (routeSegment !== pathSegment) {
            ok = false;
            break;
          }
        } catch (e) {
          console.error("LexumJS: Invalid encoded segment", pathSegment);
          ok = false;
          break;
        }
      }

      if (!ok) continue;

      const C = route.responsive
        ? (isMobile() ? route.responsive.mobile : route.responsive.desktop)
        : route.component;

      return { component: React.memo(C), params, route };
    }
    return null;
  };

  // React context
  const RouterContext = React.createContext({
    route: { component: null, params: {}, data: null },
    navigate: (p) => {}
  });

  const RouterProvider = ({ children }) => {
    const [route, setRoute] = React.useState({ component: null, params: {}, data: null });

    React.useEffect(() => {
      routeUpdate = setRoute;
      if (pendingRoute) {
        try {
          setRoute(pendingRoute);
        } finally {
          pendingRoute = null;
        }
      }
    }, []);

    return React.createElement(RouterContext.Provider, { value: { route, navigate } }, children);
  };

  // Outlet: renders only the current route's component
  const Outlet = () => {
    const { route } = React.useContext(RouterContext);
    const C = route.component;
    if (!C) return null;
    return React.createElement(C, Object.assign({}, route.params, { routeData: route.data }));
  };

  // Navigate function
  function navigate(path) {
    if (path === currentPath) return;
    try {
      showLoader();
    } catch (e) {
      /* noop */
    }

    if (mode === "history") {
      history.pushState({}, "", path);
      handleRouteChange(path);
    } else {
      location.hash = path;
    }
  }

  // Compatibility specialnavigate
  function specialnavigate(path) {
    try {
      showLoader();
    } catch (e) {
      /* noop */
    }
    if (mode === "history") {
      history.pushState({}, "", path);
      handleRouteChange(path);
    } else {
      location.hash = path;
    }
  }

  // Handle route change
  const handleRouteChange = async (explicitPath) => {
    const path = explicitPath || getPath();
    if (path === currentPath && !explicitPath) return;
    currentPath = path;

    const match = matchRoute(path);
    if (!match) return error(`No match for path: ${path}`);

    const { component: Component, params, route } = match;
    const preloadFn = (route && route.preload) || (Component && Component.preload);

    const willShowLoader = Boolean(preloadFn);
    try {
      if (willShowLoader && typeof showLoader === "function") showLoader();

      let data = null;
      if (preloadFn) {
        const maybePromise = preloadFn(params);
        if (maybePromise && typeof maybePromise.then === "function") {
          data = await maybePromise;
        } else {
          data = maybePromise;
        }
      }

      if (routeUpdate) {
        routeUpdate((prev) => {
          if (prev && prev.component && prev.component === Component) {
            return { component: Component, params: params, data };
          }
          return { component: Component, params: params, data };
        });
      } else {
        pendingRoute = { component: Component, params: params, data };
      }

      requestAnimationFrame(() => {
        tryHideLoader();
      });
    } catch (err) {
      tryHideLoader();
      error("Route preload failed", err);
    }
  };

  // Intercept <a data-lexum> clicks
  const interceptLinks = () => {
    document.body.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-lexum]");
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute("href") || "/";
      navigate(href);
    });
  };

  // Reload current route
  const reload = () => {
    handleRouteChange(currentPath || getPath());
  };

  // Init
  const init = ({ root: rootId, routes: userRoutes, mode: userMode = "hash" }) => {
    root = document.getElementById(rootId);
    if (!root) return error(`Root '${rootId}' not found`);
    mode = userMode === "history" ? "history" : "hash";
    routes.push(...userRoutes);

    ReactDOM.createRoot(root).render(
      React.createElement(RouterProvider, null, React.createElement(Outlet))
    );

    if (mode === "hash") window.addEventListener("hashchange", () => handleRouteChange());
    else window.addEventListener("popstate", () => handleRouteChange());

    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(() => handleRouteChange(), 0);
    } else {
      window.addEventListener("load", () => setTimeout(() => handleRouteChange(), 0), { once: true });
    }

    interceptLinks();
    console.log(`LexumJS v${version} mounted in ${mode} mode`);
  };

  // Public API
  return {
    init,
    version,
    error,
    navigate,
    specialnavigate,
    showLoader,
    tryHideLoader,
    ready,
    reload
  };
})();
