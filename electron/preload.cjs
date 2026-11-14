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
  setTheme: (theme) => ipcRenderer.send("theme:set", theme),
});
