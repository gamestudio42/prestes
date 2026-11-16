import { versionPublicUrls } from '@prestes/view3d';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import { EditorApp } from './EditorApp';
import '../styles/index.css';
import './editor.css';

// prepare-online-release D5: models and textures are fetched with the build's version.
versionPublicUrls();

const root = document.getElementById('root');
if (!root) {
  throw new Error('root element not found');
}

createRoot(root).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>,
);
