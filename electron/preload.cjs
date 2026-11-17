// Ponte segura entre a página e o processo principal (tipos em src/types/slash.d.ts).
const { contextBridge, ipcRenderer } = require("electron");

const dataDirArg = process.argv.find((arg) => arg.startsWith("--slash-data-dir="));

contextBridge.exposeInMainWorld("slash", {
  dataDir: dataDirArg ? dataDirArg.slice("--slash-data-dir=".length) : "",
  platform: process.platform,
  storage: {
    get: (name) => ipcRenderer.invoke("storage:get", name),
    set: (name, value) => ipcRenderer.invoke("storage:set", name, value),
    remove: (name) => ipcRenderer.invoke("storage:remove", name),
  },
  saveFile: (name, data) => ipcRenderer.invoke("file:save", name, data),
  versions: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
  info: () => ipcRenderer.invoke("app:info"),
  data: {
    stats: () => ipcRenderer.invoke("data:stats"),
    openFolder: () => ipcRenderer.invoke("data:open-folder"),
    chooseFolder: (title) => ipcRenderer.invoke("data:choose-folder", title),
    inspect: (dir) => ipcRenderer.invoke("data:inspect", dir),
    change: (dir, mode) => ipcRenderer.invoke("data:change", dir, mode),
    backup: () => ipcRenderer.invoke("data:backup"),
    openBackup: (dir) => ipcRenderer.invoke("data:open-backup", dir),
  },
  updates: {
    getStatus: () => ipcRenderer.invoke("update:get-status"),
    check: () => ipcRenderer.invoke("update:check"),
    install: () => ipcRenderer.invoke("update:install"),
    onStatus: (callback) => {
      const listener = (_e, status) => callback(status);
      ipcRenderer.on("update:status", listener);
      return () => ipcRenderer.removeListener("update:status", listener);
    },
  },
  setSpellcheck: (enabled) => ipcRenderer.send("spellcheck:set", enabled),
  setTheme: (theme) => ipcRenderer.send("theme:set", theme),
});

// Assistente de IA (electron/ai.cjs). Separado de `slash` para a página poder funcionar sem ele.
contextBridge.exposeInMainWorld("slashAI", {
  status: () => ipcRenderer.invoke("ai:status"),
  setKey: (key, model) => ipcRenderer.invoke("ai:set-key", key, model),
  clearKey: () => ipcRenderer.invoke("ai:clear-key"),
  generate: (request) => ipcRenderer.invoke("ai:generate", request),
  stream: (id, request, handlers) => {
    const onChunk = (_e, reqId, text) => reqId === id && handlers.onChunk(text);
    const cleanup = () => {
      ipcRenderer.removeListener("ai:chunk", onChunk);
      ipcRenderer.removeListener("ai:done", onDone);
      ipcRenderer.removeListener("ai:error", onError);
    };
    const onDone = (_e, reqId) => {
      if (reqId !== id) return;
      cleanup();
      handlers.onDone();
    };
    const onError = (_e, reqId, message) => {
      if (reqId !== id) return;
      cleanup();
      handlers.onError(message);
    };
    ipcRenderer.on("ai:chunk", onChunk);
    ipcRenderer.on("ai:done", onDone);
    ipcRenderer.on("ai:error", onError);
    return ipcRenderer.invoke("ai:stream", id, request);
  },
  cancel: (id) => ipcRenderer.invoke("ai:cancel", id),
});
