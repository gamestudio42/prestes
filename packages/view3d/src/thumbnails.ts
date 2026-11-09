import * as THREE from 'three';
import { propPreview } from './battle-map-layer';
import { loadEnvironmentAsset, type EnvironmentAsset } from './environment-models';
import { PALETTE } from './palette';

/**
 * refine-map-editor 5.1: small pictures of props (the trees tool's species
 * list), drawn by the same models or placeholders the battle layer uses,
 * from a three-quarter view on a transparent ground.
 */
export async function renderThumbnails(models: readonly string[], size = 64, base = './models/'): Promise<Map<string, string>> {
  let asset: EnvironmentAsset | null = null;
  try {
    asset = await loadEnvironmentAsset(base);
  } catch {
    // Without the models every prop shows its placeholder.
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  scene.add(new THREE.HemisphereLight(PALETTE.skyLight, PALETTE.groundLight, 1.6));
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.6);
  sun.position.set(-3, 6, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  const pictures = new Map<string, string>();
  try {
    for (const model of models) {
      const object = propPreview(model, asset);
      if (!object) continue;
      scene.add(object);
      const box = new THREE.Box3().setFromObject(object);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const distance = sphere.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.05;
      camera.position.copy(sphere.center).add(new THREE.Vector3(0.7, 0.45, 0.7).normalize().multiplyScalar(distance));
      camera.lookAt(sphere.center);
      renderer.render(scene, camera);
      pictures.set(model, renderer.domElement.toDataURL('image/png'));
      scene.remove(object);
    }
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return pictures;
}
