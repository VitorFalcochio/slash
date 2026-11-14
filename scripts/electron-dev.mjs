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

const electron = spawn(electronPath, [root], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, SLASH_DEV_URL: DEV_URL },
});

const shutdown = () => {
  next.kill();
  electron.kill();
};
electron.on("exit", () => {
  next.kill();
  process.exit(0);
});
next.on("exit", (code) => {
  electron.kill();
  process.exit(code ?? 0);
});
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
