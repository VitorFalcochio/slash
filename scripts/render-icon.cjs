// Roda dentro do Electron (chamado por make-icon.mjs): desenha electron/icon.svg em vários tamanhos
// e grava electron/icon.png, electron/icon.ico, public/icon.png (logo do app) e src/app/favicon.ico.
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const SVG = path.join(root, "electron", "icon.svg");
const MAX = 1024;
const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const FAVICON_SIZES = [16, 32, 48];

app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.disableHardwareAcceleration();
setTimeout(() => {
  console.error("Tempo esgotado ao gerar o ícone.");
  app.exit(1);
}, 60000);

// ICO com imagens PNG dentro (aceito desde o Windows Vista).
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // tipo: ícone
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const e = i * 16;
    dir[e] = size >= 256 ? 0 : size;
    dir[e + 1] = size >= 256 ? 0 : size;
    dir.writeUInt16LE(1, e + 4); // planos
    dir.writeUInt16LE(32, e + 6); // bits por pixel
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: MAX,
    height: MAX,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: true },
  });
  // O SVG vai embutido: uma página data: não pode ler arquivos file://.
  const svgSrc = "data:image/svg+xml;base64," + fs.readFileSync(SVG).toString("base64");
  const html = `<body style="margin:0;background:transparent;overflow:hidden">
    <img id="i" src="${svgSrc}" style="display:block"></body>`;
  await win.loadURL("data:text/html," + encodeURIComponent(html));
  await win.webContents.executeJavaScript("document.fonts.ready.then(() => document.getElementById('i').decode())");

  // Cada tamanho é desenhado direto do vetor (fica mais nítido que reduzir uma imagem grande).
  const render = async (size) => {
    await win.webContents.executeJavaScript(`(() => { const i = document.getElementById('i'); i.width = ${size}; i.height = ${size}; })()`);
    await new Promise((r) => setTimeout(r, 250));
    let img = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
    if (img.getSize().width !== size) img = img.resize({ width: size, height: size, quality: "best" });
    return { size, data: img.toPNG() };
  };

  const sizes = [...new Set([512, ...ICO_SIZES, ...FAVICON_SIZES])];
  const out = {};
  for (const s of sizes) out[s] = await render(s);

  fs.writeFileSync(path.join(root, "electron", "icon.png"), out[512].data);
  fs.writeFileSync(path.join(root, "public", "icon.png"), out[256].data); // logo usada dentro do app
  fs.writeFileSync(path.join(root, "electron", "icon.ico"), buildIco(ICO_SIZES.map((s) => out[s])));
  fs.writeFileSync(path.join(root, "src", "app", "favicon.ico"), buildIco(FAVICON_SIZES.map((s) => out[s])));
  console.log("Ícone gerado: electron/icon.png, electron/icon.ico, public/icon.png, src/app/favicon.ico");
  app.exit(0);
}).catch((err) => {
  console.error("Falha ao gerar o ícone:", err);
  app.exit(1);
});
