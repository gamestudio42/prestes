import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import { App } from './App';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('root element not found');
}

// prepare-online-release D4: a browser that cannot run the game keeps the splash's message.
if (!window.__prestesUnsupported) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}


