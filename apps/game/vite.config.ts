import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
  },
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor libraries in their own chunks: they change rarely (better
        // caching) and the game code keeps its own budget.
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
