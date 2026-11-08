import { battleMaps } from '@prestes/shared';
import { SceneView } from '@prestes/view3d';

/**
 * refine-battle-maps 6.3: one battle map seen straight down over its bounds,
 * with the pixel post and both deployment zones marked, for
 * `tools/map-previews.ts` to shoot. Dev only: `preview.html` is not a build
 * input. `?map=<id>` picks the map; `window.__previewReady` turns true once
 * the scene's models have had time to load.
 */
const id = new URLSearchParams(window.location.search).get('map') ?? 'fazenda';
const map = battleMaps().find((entry) => entry.id === id);
const container = document.getElementById('view');
const host = window as unknown as { __previewReady?: boolean; __previewError?: string };

if (!map || !container) {
  host.__previewError = `no battle map ${id}`;
} else {
  const view = new SceneView({ container, battleMap: map, strategicField: true });
  view.setTopDown(true);
  view.squareOn();
  view.frameMap();
  // No frames ever arrive here, so the marks never start their 10 s fade.
  view.setDeploymentLabels({ own: '', enemy: '' });
  window.setTimeout(() => {
    host.__previewReady = true;
  }, 4000);
}
