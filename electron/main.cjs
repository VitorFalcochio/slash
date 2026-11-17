// Processo principal do Electron: janela nativa, arquivos do app e banco de dados em disco.
const { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme, net, protocol, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { setupUpdater } = require("./updater.cjs");
const { setupAI } = require("./ai.cjs");

// Configuração do app, fora da pasta de dados (é ela que diz onde a pasta de dados está).
// SLASH_CONFIG_FILE troca o arquivo (usado em testes, para não mexer na configuração real).
const CONFIG_FILE = process.env.SLASH_CONFIG_FILE || path.join(app.getPath("appData"), "Slash", "config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

/** E:\SlashData quando existe o drive E:, senão Documentos\SlashData. */
function defaultDataDir() {
  return process.platform === "win32" && fs.existsSync("E:\\")
    ? "E:\\SlashData"
    : path.join(app.getPath("documents"), "SlashData");
}

// Pasta de dados: banco, anexos e também os dados internos do Electron/Chromium
// (por padrão ficariam em C:\Users\...\AppData).
// Ordem: variável SLASH_DATA_DIR > local escolhido nas Configurações > padrão.
const configuredDir = readConfig().dataDir;
const DATA_DIR_SOURCE = process.env.SLASH_DATA_DIR ? "env" : configuredDir ? "config" : "default";
const DATA_DIR = process.env.SLASH_DATA_DIR || configuredDir || defaultDataDir();
const FILES_DIR = path.join(DATA_DIR, "files");
const PAGES_DIR = path.join(DATA_DIR, "pages");
const DEV_URL = process.env.SLASH_DEV_URL;
const OUT_DIR = path.join(__dirname, "..", "out");

const THEME = {
  light: { color: "#ffffff", symbolColor: "#37352f" },
  dark: { color: "#191919", symbolColor: "#d4d4d4" },
};

fs.mkdirSync(FILES_DIR, { recursive: true });
fs.mkdirSync(PAGES_DIR, { recursive: true });
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

// "page-<uuid>" é o conteúdo de uma página, guardado em pages/<uuid>.json (um arquivo por página).
function storeFile(name) {
  const page = /^page-([0-9a-f-]{36})$/.exec(name);
  if (page) return path.join(PAGES_DIR, `${page[1]}.json`);
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
  const file = storeFile(name);
  // Uma gravação ainda na fila é a versão mais nova (ex.: reabrir uma página logo depois de editar).
  const pending = pendingWrites.get(file);
  if (pending) return pending.value;
  try {
    return await fsp.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
});

// Enquanto os dados são copiados para outro local, novas gravações são recusadas
// (iriam para a pasta antiga e se perderiam).
let relocating = false;

ipcMain.handle("storage:set", (_e, name, value) => {
  if (relocating) throw new Error("Os dados estão sendo movidos");
  return scheduleWrite(storeFile(name), value);
});

ipcMain.handle("storage:remove", async (_e, name) => {
  const file = storeFile(name);
  const pending = pendingWrites.get(file);
  if (pending) {
    clearTimeout(pending.timer);
    pendingWrites.delete(file);
    pending.waiters.forEach((w) => w.resolve());
  }
  await fsp.rm(file, { force: true });
  await fsp.rm(`${file}.bak`, { force: true });
});

ipcMain.handle("file:save", async (_e, originalName, data) => {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.\w]/g, "").slice(0, 10);
  const fileName = `${crypto.randomUUID()}${ext}`;
  await fsp.writeFile(path.join(FILES_DIR, fileName), Buffer.from(data));
  return `slash-file://files/${fileName}`;
});

// ---------- Configurações: armazenamento, informações, ortografia ----------

function flushAllWrites() {
  return Promise.allSettled([...pendingWrites.keys()].map(flushWrite));
}

/** Copia os dados (tudo menos os arquivos internos do Electron) sem sobrescrever nada no destino. */
async function copyData(from, to) {
  await fsp.mkdir(to, { recursive: true });
  for (const entry of await fsp.readdir(from)) {
    if (entry === "electron") continue;
    await fsp.cp(path.join(from, entry), path.join(to, entry), { recursive: true, force: false, errorOnExist: false });
  }
}

async function dirSize(dir) {
  let bytes = 0;
  let count = 0;
  let entries = [];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return { bytes, count };
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await dirSize(full);
      bytes += sub.bytes;
      count += sub.count;
    } else {
      try {
        bytes += (await fsp.stat(full)).size;
        count += 1;
      } catch {}
    }
  }
  return { bytes, count };
}

const samePath = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const isInside = (child, parent) =>
  path.resolve(child).toLowerCase().startsWith(path.resolve(parent).toLowerCase() + path.sep);

/** Reinicia o app. No modo dev, o código 75 pede ao scripts/electron-dev.mjs para abrir a janela de novo. */
async function restartApp() {
  await flushAllWrites();
  if (DEV_URL) return app.exit(75);
  app.relaunch();
  app.exit(0);
}

ipcMain.handle("app:info", () => ({
  version: app.getVersion(),
  dataDir: DATA_DIR,
  dataDirSource: DATA_DIR_SOURCE,
  defaultDataDir: defaultDataDir(),
}));

ipcMain.handle("data:stats", async () => {
  const pages = (await fsp.readdir(PAGES_DIR).catch(() => [])).filter((f) => f.endsWith(".json"));
  const [pagesSize, files, cache, all] = await Promise.all([
    dirSize(PAGES_DIR),
    dirSize(FILES_DIR),
    dirSize(path.join(DATA_DIR, "electron")),
    dirSize(DATA_DIR),
  ]);
  return {
    pages: pages.length,
    pagesBytes: pagesSize.bytes,
    files: files.count,
    filesBytes: files.bytes,
    cacheBytes: cache.bytes,
    dataBytes: all.bytes - cache.bytes,
  };
});

ipcMain.handle("data:open-folder", () => shell.openPath(DATA_DIR));

ipcMain.handle("data:choose-folder", async (e, title) => {
  const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title,
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("data:inspect", (_e, dir) => ({
  hasData: fs.existsSync(path.join(dir, "slash-documents.json")),
  isCurrent: samePath(dir, DATA_DIR),
  insideCurrent: isInside(dir, DATA_DIR),
}));

// mode "copy": copia os dados atuais para a pasta nova. mode "use": passa a usar os dados que já estão lá.
// A pasta antiga nunca é apagada.
ipcMain.handle("data:change", async (_e, dir, mode) => {
  if (DATA_DIR_SOURCE === "env") throw new Error("O local está definido pela variável SLASH_DATA_DIR");
  if (!path.isAbsolute(dir) || samePath(dir, DATA_DIR) || isInside(dir, DATA_DIR)) throw new Error("Pasta inválida");
  const hasData = fs.existsSync(path.join(dir, "slash-documents.json"));
  if (mode === "copy" && hasData) throw new Error("A pasta de destino já tem dados do Slash");
  if (mode === "use" && !hasData) throw new Error("A pasta escolhida não tem dados do Slash");

  relocating = true;
  try {
    await flushAllWrites();
    if (mode === "copy") await copyData(DATA_DIR, dir);
    writeConfig({ ...readConfig(), dataDir: dir });
  } catch (error) {
    relocating = false;
    throw error;
  }
  setTimeout(restartApp, 300);
});

// Pastas de backup criadas nesta sessão: só essas podem ser abertas pelo botão "Abrir".
const backupDirs = new Set();

ipcMain.handle("data:backup", async (e) => {
  const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: "Onde salvar o backup",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled) return null;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const dest = path.join(result.filePaths[0], `Slash-backup-${stamp}`);
  if (samePath(result.filePaths[0], DATA_DIR) || isInside(dest, DATA_DIR)) {
    throw new Error("Escolha uma pasta fora da pasta de dados");
  }
  await flushAllWrites();
  await copyData(DATA_DIR, dest);
  backupDirs.add(dest);
  return dest;
});

ipcMain.handle("data:open-backup", (_e, dir) => (backupDirs.has(dir) ? shell.openPath(dir) : null));

ipcMain.on("spellcheck:set", (e, enabled) => {
  e.sender.session.setSpellCheckerEnabled(Boolean(enabled));
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
    // No Windows o .ico traz cada tamanho desenhado à parte (barra de tarefas mais nítida).
    icon: path.join(__dirname, process.platform === "win32" ? "icon.ico" : "icon.png"),
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

  // Menu do clique direito: sugestões de ortografia e recortar/copiar/colar.
  win.webContents.on("context-menu", (_e, params) => {
    const template = [];
    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions.slice(0, 5)) {
        template.push({ label: suggestion, click: () => win.webContents.replaceMisspelling(suggestion) });
      }
      if (params.dictionarySuggestions.length === 0) template.push({ label: "Sem sugestões", enabled: false });
      template.push(
        {
          label: "Adicionar ao dicionário",
          click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
        },
        { type: "separator" },
      );
    }
    if (params.isEditable) {
      template.push(
        { label: "Recortar", role: "cut", enabled: params.editFlags.canCut },
        { label: "Copiar", role: "copy", enabled: params.editFlags.canCopy },
        { label: "Colar", role: "paste", enabled: params.editFlags.canPaste },
        { type: "separator" },
        { label: "Selecionar tudo", role: "selectAll" },
      );
    } else if (params.selectionText) {
      template.push({ label: "Copiar", role: "copy" });
    }
    if (template.length) Menu.buildFromTemplate(template).popup({ window: win });
  });

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

  // Só o app instalado se atualiza; antes de instalar, grava o que estiver pendente.
  setupUpdater({ enabled: app.isPackaged && !DEV_URL, beforeInstall: flushAllWrites });
  setupAI({ dataDir: DATA_DIR });
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
