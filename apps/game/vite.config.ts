import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mapSavePlugin } from './vite-map-save';
import { pendingImagesPlugin } from './vite-pending-images';

/**
 * prepare-online-release D5: the build's id, the version every public file is
 * asked for with: the commit, plus the build time when the tree had changes,
 * so two builds of different sources never share an id. Outside git, the
 * build time alone.
 */
function buildId(): string {
  const time = Date.now().toString(36);
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const changed = execSync('git status --porcelain --untracked-files=no', { encoding: 'utf8' }).trim() !== '';
    return changed ? `${commit}-${time}` : commit;
  } catch {
    return time;
  }
}

export default defineConfig(({ command, mode }) => ({
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(command === 'build' ? buildId() : 'dev'),
  },
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
    // prepare-online-release D6: the release check reads what a first visit downloads from the manifest.
    manifest: true,
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
