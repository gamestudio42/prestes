/// <reference types="vite/client" />

// prepare-online-release D1 and D4: set by the inline script in index.html.
interface Window {
  /** What the browser lacks to run the game (`webgl2`, `workers`); the app does not mount. */
  __prestesUnsupported?: readonly string[];
  /** Fades the opening splash out; resolves once it has left the page. */
  __prestesReady?: () => Promise<void>;
}
