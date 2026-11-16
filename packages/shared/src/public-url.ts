/**
 * prepare-online-release D5: the build's id, set by Vite's `define` (the
 * commit, and the build time when the tree had changes); `dev` on the
 * development server, in tests and in tools.
 */
declare const __BUILD_ID__: string | undefined;

export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' && __BUILD_ID__ !== '' ? __BUILD_ID__ : 'dev';

/** URLs that never come from the public folder: inline data, object URLs, other sites. */
const NOT_PUBLIC = /^(?:data:|blob:|[a-z][a-z0-9+.-]*:\/\/)/i;

/**
 * D5: a public-folder file's URL with the build's id as its version, so a new
 * release never mixes with a cached model, sound, image or track:
 * `models/soldier.glb` becomes `models/soldier.glb?v=<build id>`.
 */
export function publicUrl(path: string, build: string = BUILD_ID): string {
  if (NOT_PUBLIC.test(path) || /[?&]v=/.test(path)) return path;
  const hash = path.indexOf('#');
  const [body, fragment] = hash === -1 ? [path, ''] : [path.slice(0, hash), path.slice(hash)];
  return `${body}${body.includes('?') ? '&' : '?'}v=${encodeURIComponent(build)}${fragment}`;
}
