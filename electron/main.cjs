// Processo principal do Electron: janela nativa, arquivos do app e banco de dados em disco.
const { app, BrowserWindow, ipcMain, nativeTheme, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

// Pasta de dados: banco, anexos e também os dados internos do Electron/Chromium
// (por padrão ficariam em C:\Users\...\AppData).
const DATA_DIR = process.env.SLASH_DATA_DIR || "E:\\SlashData";
const FILES_DIR = path.join(DATA_DIR, "files");
const DEV_URL = process.env.SLASH_DEV_URL;
const OUT_DIR = path.join(__dirname, "..", "out");

const THEME = {
  light: { color: "#ffffff", symbolColor: "#37352f" },
  dark: { color: "#191919", symbolColor: "#d4d4d4" },
};

fs.mkdirSync(FILES_DIR, { recursive: true });
app.setPath("userData", path.join(DATA_DIR, "electron"));
app.setPath("sessionData", path.join(DATA_DIR, "electron"));
app.setPath("logs", path.join(DATA_DIR, "electron", "logs"));
app.setPath("crashDumps", path.join(DATA_DIR, "electron", "crashes"));

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  { scheme: "slash-file", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

/** Resolve um caminho dentro de `root`, impedindo acesso fora dela (ex.: "../"). */
function safeJoin(root, relative) {
  const resolved = path.join(root, relative);
  return resolved.startsWith(root + path.sep) || resolved === root ? resolved : null;
}

// ---------- Banco de dados (arquivos JSON em DATA_DIR) ----------

function storeFile(name) {
  if (!/^[\w-]+$/.test(name)) throw new Error(`Nome de armazenamento inválido: ${name}`);
  return path.join(DATA_DIR, `${name}.json`);
}

// Gravações chegam a cada tecla; agrupa e grava no máximo a cada 300 ms por arquivo.
const pendingWrites = new Map();

async function writeAtomic(file, value) {
  const tmp = `${file}.tmp`;
  await fsp.writeFile(tmp, value, "utf8");
  // Mantém a versão anterior como backup antes de substituir.
  if (fs.existsSync(file)) await fsp.copyFile(file, `${file}.bak`);
  await fsp.rename(tmp, file);
}

function scheduleWrite(file, value) {
  const pending = pendingWrites.get(file);
  if (pending) clearTimeout(pending.timer);
  return new Promise((resolve, reject) => {
    const waiters = pending ? [...pending.waiters, { resolve, reject }] : [{ resolve, reject }];
    const timer = setTimeout(() => flushWrite(file), 300);
    pendingWrites.set(file, { value, timer, waiters });
  });
}

async function flushWrite(file) {
  const pending = pendingWrites.get(file);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingWrites.delete(file);
  try {
    await writeAtomic(file, pending.value);
    pending.waiters.forEach((w) => w.resolve());
  } catch (error) {
    pending.waiters.forEach((w) => w.reject(error));
  }
}

ipcMain.handle("storage:get", async (_e, name) => {
  try {
    return await fsp.readFile(storeFile(name), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
});

ipcMain.handle("storage:set", (_e, name, value) => scheduleWrite(storeFile(name), value));

ipcMain.handle("storage:remove", async (_e, name) => {
  await fsp.rm(storeFile(name), { force: true });
});

ipcMain.handle("file:save", async (_e, originalName, data) => {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.\w]/g, "").slice(0, 10);
  const fileName = `${crypto.randomUUID()}${ext}`;
  await fsp.writeFile(path.join(FILES_DIR, fileName), Buffer.from(data));
  return `slash-file://files/${fileName}`;
});

ipcMain.on("theme:set", (e, theme) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && process.platform !== "darwin" && THEME[theme]) {
    win.setTitleBarOverlay({ ...THEME[theme], height: 44 });
    win.setBackgroundColor(THEME[theme].color);
  }
});

// ---------- Janela ----------

function createWindow() {
  const theme = nativeTheme.shouldUseDarkColors ? THEME.dark : THEME.light;
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 500,
    show: false,
    title: "Slash",
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: theme.color,
    titleBarStyle: "hidden",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 14, y: 14 } }
      : { titleBarOverlay: { ...theme, height: 44 } }),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      additionalArguments: [`--slash-data-dir=${DATA_DIR}`],
    },
  });

  win.once("ready-to-show", () => win.show());

  // Links externos abrem no navegador padrão, não dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(DEV_URL ? `${DEV_URL}/documents/` : "app://slash/documents/");
}

app.whenReady().then(() => {
  // Arquivos estáticos do Next (pasta out/). Rotas sem extensão viram <rota>/index.html.
  protocol.handle("app", (request) => {
    let pathname = decodeURIComponent(new URL(request.url).pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    else if (!path.extname(pathname)) pathname += "/index.html";
    const file = safeJoin(OUT_DIR, pathname);
    if (!file || !fs.existsSync(file)) return new Response("Não encontrado", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  // Anexos enviados pelo usuário, guardados em DATA_DIR/files.
  protocol.handle("slash-file", (request) => {
    const url = new URL(request.url);
    const file = url.host === "files" ? safeJoin(FILES_DIR, decodeURIComponent(url.pathname)) : null;
    if (!file || !fs.existsSync(file)) return new Response("Não encontrado", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  createWindow();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// Garante que gravações pendentes cheguem ao disco antes de fechar.
let flushedBeforeQuit = false;
app.on("before-quit", (event) => {
  if (flushedBeforeQuit || pendingWrites.size === 0) return;
  event.preventDefault();
  Promise.allSettled([...pendingWrites.keys()].map(flushWrite)).finally(() => {
    flushedBeforeQuit = true;
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
