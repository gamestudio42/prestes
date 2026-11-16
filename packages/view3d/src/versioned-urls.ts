import * as THREE from 'three';
import { publicUrl } from '@prestes/shared';

/**
 * prepare-online-release D5: every file three.js fetches (models, textures,
 * through GLTFLoader and TextureLoader on the default loading manager) asks
 * for the build's version, so a new release never draws a cached old model.
 * Object and data URLs (a GLB's own textures) pass unchanged.
 */
export function versionPublicUrls(): void {
  THREE.DefaultLoadingManager.setURLModifier((url) => publicUrl(url));
}
