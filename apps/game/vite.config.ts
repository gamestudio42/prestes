import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mapSavePlugin } from './vite-map-save';
import { pendingImagesPlugin } from './vite-pending-images';

export default defineConfig(({ mode }) => ({
  base: './',
  // add-map-editor: the dev server's "Save to project" endpoint.
  // complete-books-and-bibliography D3a: images under a permission request.
  plugins: [react(), mapSavePlugin(), pendingImagesPlugin()],
  server: {
    host: '127.0.0.1',
  },
  worker: {
    format: 'es',
  },
  build: {
    // The review build for rights holders carries the pending images; never published.
    ...(mode === 'review' ? { outDir: 'dist-review' } : {}),
    rollupOptions: {
      // add-map-editor: the map editor is its own page.
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        editor: fileURLToPath(new URL('./editor.html', import.meta.url)),
      },
      output: {
        // Vendor libraries in their own chunks: they change rarely (better
        // caching) and the game code keeps its own budget.
        manualChunks(id) {
          // glTF loading is fetched on demand, apart from the renderer.
          if (id.includes('node_modules/three/examples/')) return 'model-loaders';
          if (id.includes('node_modules/three/')) return 'three';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
}));
