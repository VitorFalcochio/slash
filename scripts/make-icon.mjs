// Gera o ícone do app a partir de electron/icon.svg (fundo preto com um "s").
// Saída: electron/icon.png (512px), electron/icon.ico (16–256px) e src/app/favicon.ico.
// O desenho é feito pelo próprio Electron, então não precisa de nenhuma dependência extra.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const electronPath = createRequire(import.meta.url)("electron");

// Terminais do VS Code herdam ELECTRON_RUN_AS_NODE=1, que desliga as APIs do Electron.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const { status } = spawnSync(electronPath, [join(here, "render-icon.cjs")], { stdio: "inherit", env });
process.exit(status ?? 1);
