import { app, BrowserWindow, ipcMain, Menu, net, protocol, shell } from 'electron';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Desktop shell: serves the built web game from `app://game/` so it boots offline.
 * The GitHub Pages build is unchanged; this process only reads the copy under `game/`.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.join(here, '..', 'game');
const ORIGIN = 'app://game';
const smoke = process.argv.includes('--smoke');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'video/webm',
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

async function serve(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Only the game host is served. A protocol-relative analytics URL stays on app:// and stops here.
  if (url.host !== 'game') return new Response('Not found', { status: 404 });
  const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.normalize(path.join(GAME_DIR, rel));
  if (!file.startsWith(GAME_DIR + path.sep)) return new Response('Not found', { status: 404 });
  const res = await net.fetch(pathToFileURL(file).toString());
  if (!res.ok) return new Response('Not found', { status: 404 });
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
      // The page's own splash script is inline; everything else is a file in the build.
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'",
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#1a100a',
    title: 'Prestes',
    show: !smoke,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, '..', 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      devTools: !app.isPackaged,
      // A hidden smoke window must still run the splash timer.
      backgroundThrottling: !smoke,
    },
  });
  // Stay inside the game: external links open in the browser, nothing else navigates.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN)) event.preventDefault();
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error(`LOAD ${code} ${description} ${url}`);
  });
  void win.loadURL(`${ORIGIN}/index.html`);
  return win;
}

/**
 * `--smoke`: open the game hidden, wait until the camp desk has replaced the splash,
 * print a one-line result and exit. The menu is the boot: a battle is not started.
 */
async function runSmoke(win: BrowserWindow): Promise<void> {
  const deadline = Date.now() + 60_000;
  let result: unknown = null;
  while (Date.now() < deadline) {
    result = await win.webContents
      .executeJavaScript(
        `({ ready: !!document.querySelector('[data-testid="start-screen"]') && !document.getElementById('splash') && !window.__prestesUnsupported, isolated: crossOriginIsolated, href: location.href })`,
      )
      .catch(() => null);
    if ((result as { ready?: boolean } | null)?.ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const ready = (result as { ready?: boolean } | null)?.ready === true;
  console.log(`SMOKE ${JSON.stringify(result)}`);
  app.exit(ready ? 0 : 1);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  ipcMain.on('prestes:quit', () => app.quit());
  protocol.handle('app', serve);
  const win = createWindow();
  if (smoke) await runSmoke(win);
});

app.on('window-all-closed', () => app.quit());
