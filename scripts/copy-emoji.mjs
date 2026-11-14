// Copia as imagens de emoji da Apple (emoji-datasource-apple) para public/ e gera
// a lista de emojis disponíveis, usada para decidir quando cair no emoji do sistema.
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "emoji-datasource-apple", "img", "apple", "64");
const target = join(root, "public", "emoji", "apple", "64");
const listFile = join(root, "src", "generated", "apple-emoji.json");

if (!existsSync(target) || readdirSync(target).length === 0) {
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
  console.log("Emojis da Apple copiados para public/emoji/apple/64");
}

if (!existsSync(listFile)) {
  const names = readdirSync(source)
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4));
  mkdirSync(dirname(listFile), { recursive: true });
  writeFileSync(listFile, JSON.stringify(names));
}
