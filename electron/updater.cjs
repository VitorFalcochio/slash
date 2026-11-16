// Atualização automática pelo GitHub Releases (configurado em "build.publish" no package.json).
// Só roda no app instalado: em dev (npm run dev / npm start sem instalar) não faz nada.
const { app, BrowserWindow, ipcMain } = require("electron");

const FIRST_CHECK_DELAY = 10 * 1000; // espera o app abrir antes de procurar
const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // e procura de novo a cada 4 horas

/**
 * Estado atual, enviado para a página pelo canal "update:status":
 * idle | checking | available | downloading | downloaded | not-available | error | disabled
 */
let status = { state: "idle" };

function setStatus(next) {
  status = next;
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send("update:status", status);
}

/** @param {{ beforeInstall: () => Promise<unknown>, enabled: boolean }} options */
function setupUpdater({ beforeInstall, enabled }) {
  ipcMain.handle("update:get-status", () => status);

  if (!enabled) {
    status = { state: "disabled" };
    ipcMain.handle("update:check", () => status);
    ipcMain.handle("update:install", () => false);
    return;
  }

  const { autoUpdater } = require("electron-updater");
  autoUpdater.autoDownload = true; // baixa em segundo plano assim que encontra
  autoUpdater.autoInstallOnAppQuit = true; // se o usuário só fechar o app, instala ao sair

  let manualCheck = false;

  autoUpdater.on("checking-for-update", () => setStatus({ state: "checking" }));
  autoUpdater.on("update-available", (info) => setStatus({ state: "available", version: info.version }));
  autoUpdater.on("update-not-available", () => setStatus({ state: "not-available", version: app.getVersion() }));
  autoUpdater.on("download-progress", (p) =>
    setStatus({ state: "downloading", version: status.version, percent: Math.round(p.percent) }),
  );
  autoUpdater.on("update-downloaded", (info) => setStatus({ state: "downloaded", version: info.version }));
  autoUpdater.on("error", (err) => {
    console.error("[atualização]", err);
    // Sem internet numa checagem automática não é motivo para avisar ninguém.
    setStatus({ state: "error", message: manualCheck ? String(err?.message || err) : "" });
  });

  const check = async (manual = false) => {
    if (["checking", "downloading", "downloaded"].includes(status.state)) return status;
    manualCheck = manual;
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // o evento "error" já cuidou do estado
    }
    return status;
  };

  ipcMain.handle("update:check", () => check(true));
  ipcMain.handle("update:install", async () => {
    if (status.state !== "downloaded") return false;
    await beforeInstall();
    // isSilent=false mostra o instalador; isForceRunAfter=true reabre o Slash ao terminar.
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return true;
  });

  setTimeout(() => check(), FIRST_CHECK_DELAY);
  setInterval(() => check(), CHECK_INTERVAL);
}

module.exports = { setupUpdater };
