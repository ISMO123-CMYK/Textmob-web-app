window.Lexum = (() => {
  const routes = [];
  let root = null;
  const version = "1.2.3";
  let mode = "hash";

  let currentComponent = null;
  let currentParams = {};
  let rerender = null;
  let currentPath = null;

  // Loader elements
  let loaderOverlay = null;
  let progressBar = null;
  let progressInterval = null;
  let hideTimeout = null;
  let isReady = false;

  // Create loader elements once
  const createLoader = () => {
    if (loaderOverlay) return;
    
    loaderOverlay = document.createElement("div");
    loaderOverlay.className = "fixed inset-0 bg-black bg-opacity-50 z-50 hidden";
    document.body.appendChild(loaderOverlay);

    const barContainer = document.createElement("div");
    barContainer.className = "fixed top-0 left-0 w-full h-1 bg-transparent z-50";
    progressBar = document.createElement("div");
    progressBar.className = "h-full bg-blue-500 transition-[width]";
    progressBar.style.width = "0%";
    barContainer.appendChild(progressBar);
    document.body.appendChild(barContainer);
  };

  // Show loader & start progress animation
  const showLoader = () => {
    createLoader();
    isReady = false;
    loaderOverlay.classList.remove("hidden");
    progressBar.style.width = "0%";

    clearInterval(progressInterval);
    clearTimeout(hideTimeout);

    // Fake progress up to 90%
    let pct = 0;
    progressInterval = setInterval(() => {
      if (pct < 90) {
        pct += Math.random() * 8;
        progressBar.style.width = pct + "%";
      }
    }, 100);

    // Minimum display time of 5s
    hideTimeout = setTimeout(() => {
      tryHideLoader();
    }, 5000);
  };

  // Hide loader only if both ready and min time passed
  const tryHideLoader = () => {
    if (!isReady) return;
    clearInterval(progressInterval);
    clearTimeout(hideTimeout);
    progressBar.style.width = "100%";
    setTimeout(() => {
      loaderOverlay.classList.add("hidden");
      progressBar.style.width = "0%";
    }, 200);
  };

  // Call when component finished its own loading early
  const ready = () => {
    isReady = true;
    tryHideLoader();
  };

  const error = (msg, trace = "") => {
    console.error(`[LexumJS Error]: ${msg}`);
    if (trace) console.trace(trace);
  };

  const isMobile = () => /android|iphone|ipad|ipod|windows phone|mobile/i
    .test(navigator.userAgent || "");

  const getPath = () =>
    mode === "hash" ? location.hash.slice(1) || "/" : location.pathname || "/";

    const matchRoute = (path) => {
      for (const route of routes) {
        const rp = route.path.split("/");
        const pp = path.split("/");
    
        if (rp.length !== pp.length) continue;
    
        const params = {};
        let ok = true;
    
        for (let i = 0; i < rp.length; i++) {
          const routeSegment = rp[i];
          const pathSegment = pp[i];
    
          try {
            // Handle standard dynamic route like ':username'
            if (routeSegment.startsWith(":")) {
              params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
            }
            // Handle custom wrapped dynamic like '@(:username)'
            else if (routeSegment.includes("(:") && routeSegment.endsWith(")")) {
              const match = routeSegment.match(/^(.*)\(:([^)]+)\)$/);
              if (match) {
                const prefix = match[1];      // e.g., "@"
                const paramName = match[2];   // e.g., "username"
                if (pathSegment.startsWith(prefix)) {
                  const raw = pathSegment.slice(prefix.length);
                  params[paramName] = decodeURIComponent(raw);
                } else {
                  ok = false;
                  break;
                }
              } else {
                ok = false;
                break;
              }
            }
            // Exact static match
            else if (routeSegment !== pathSegment) {
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
    
        return { component: React.memo(C), params };
      }
      return null;
    };
    
  const Wrapper = () => {
    const [view, setView] = React.useState({
      component: currentComponent, params: currentParams
    });
    React.useEffect(() => { rerender = setView; }, []);
    const { component: C, params } = view;
    return C ? React.createElement(C, params) : null;
  };

  const render = (Component, props = {}) => {
    if (!root) return error("Root not found. Call Lexum.init({root:'id'})");

    const sameC = currentComponent === Component;
    const sameP = JSON.stringify(currentParams) === JSON.stringify(props);
    if (sameC && sameP) return;

    currentComponent = Component;
    currentParams = props;

    if (!rerender) {
      ReactDOM.createRoot(root).render(React.createElement(Wrapper));
    } else {
      rerender({ component: Component, params: props });
    }

    // signal ready once React has painted
    // React 18 doesn't give a callback, so use a small delay
    setTimeout(() => { ready(); }, 5000);
  };

  const handleRouteChange = () => {
    const path = getPath();
    if (path === currentPath) return;
    currentPath = path;

    const match = matchRoute(path);
    if (match) {
      showLoader();
      render(match.component, match.params);
    } else {
      error(`No match for path: ${path}`);
    }
  };
  const handleSpecialRouteChange = () => {
    const path = getPath();
    currentPath = path;

    const match = matchRoute(path);
    if (match) {
      showLoader();
      render(match.component, match.params);
    } else {
      error(`No match for path: ${path}`);
    }
  };
  const navigate = (path) => {
    if (path === currentPath) return;
    showLoader();
    if (mode === "history") {
      history.pushState({}, "", path);
      handleRouteChange();
    } else {
      location.hash = path;
    }
  };
  const specialnavigate = (path) => {
    showLoader();
    if (mode === "history") {
      history.pushState({}, "", path);
      handleSpecialRouteChange();
    } else {
      location.hash = path;
    }
  };
  const interceptLinks = () => {
    document.body.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-lexum]");
      if (!a) return;
      e.preventDefault();
      navigate(a.getAttribute("href") || "/");
    });
  };

  const reload = () => {
    // Invalidate the currentComponent so Lexum will always re-render it
    currentComponent = null;
    currentParams = {};
    specialnavigate(location.pathname)
  };
  
  const init = ({ root: rootId, routes: userRoutes, mode: userMode="hash" }) => {
    root = document.getElementById(rootId);
    if (!root) return error(`Root '${rootId}' not found`);
    mode = userMode==="history" ? "history" : "hash";
    routes.push(...userRoutes);

    if (mode==="hash") window.addEventListener("hashchange", handleRouteChange);
    else window.addEventListener("popstate", handleRouteChange);

    window.addEventListener("load", handleRouteChange);
    interceptLinks();
    console.log(`LexumJS v${version} in ${mode} mode`);
  };

  return { init, version, error, navigate, ready, reload };
})();
