// Minimal bridge: the page can ask the shell to quit. Nothing else is exposed.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- sandboxed preloads must be CommonJS
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prestesDesktop', {
  quit: () => ipcRenderer.send('prestes:quit'),
});
