import * as THREE from 'three';

let gradient: THREE.DataTexture | null = null;

/** Three-band toon ramp shared by every lit material. */
export function toonGradient(): THREE.DataTexture {
  if (gradient) {
    return gradient;
  }
  const data = new Uint8Array([64, 64, 64, 255, 152, 152, 152, 255, 255, 255, 255, 255]);
  const texture = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  gradient = texture;
  return texture;
}

let terrainRamp: THREE.DataTexture | null = null;

/**
 * refine-battle-maps 5.9: the ground's toon ramp. Six soft steps instead of
 * three hard bands, so a long hill slope shades in gentle terraces rather
 * than one dark stripe.
 */
export function terrainGradient(): THREE.DataTexture {
  if (terrainRamp) {
    return terrainRamp;
  }
  const steps = [118, 146, 172, 198, 226, 255];
  const data = new Uint8Array(steps.flatMap((value) => [value, value, value, 255]));
  const texture = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  terrainRamp = texture;
  return texture;
}

export function toon(params: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ gradientMap: toonGradient(), ...params });
}
