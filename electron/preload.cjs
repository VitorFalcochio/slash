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
