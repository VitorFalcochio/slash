// Desenvolvimento: sobe o `next dev` e abre o Electron apontando para ele.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const electronPath = require("electron");
const PORT = process.env.PORT || "3210";
const DEV_URL = `http://localhost:${PORT}`;

const next = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--port", PORT], {
  cwd: root,
  stdio: "inherit",
});

async function waitForServer() {
  for (;;) {
    try {
      const res = await fetch(`${DEV_URL}/documents/`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
}

await waitForServer();

// O código 75 é o pedido de reinício do app (ex.: depois de mudar o local dos dados).
const RESTART_CODE = 75;
let electron;

function startElectron() {
  // Terminais do VS Code herdam ELECTRON_RUN_AS_NODE=1, que faz o Electron rodar como Node puro
  // (sem `app`, `BrowserWindow` etc.). Removemos para abrir o app de verdade.
  const env = { ...process.env, SLASH_DEV_URL: DEV_URL };
  delete env.ELECTRON_RUN_AS_NODE;
  electron = spawn(electronPath, [root], {
    cwd: root,
    stdio: "inherit",
    env,
  });
  electron.on("exit", (code) => {
    if (code === RESTART_CODE) return startElectron();
    next.kill();
    process.exit(0);
  });
}

startElectron();

const shutdown = () => {
  next.kill();
  electron.kill();
};
next.on("exit", (code) => {
  electron.kill();
  process.exit(code ?? 0);
});
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
