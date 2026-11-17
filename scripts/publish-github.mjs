// Publica no GitHub Releases o instalador que o `electron-builder --publish never` deixou em release/.
//
// Por que não deixar o electron-builder publicar: ele envia os arquivos em paralelo e cada envio tenta
// criar o release; o segundo pedido falha ("Published releases must have a valid tag") e o
// latest.yml acaba não sendo enviado — sem ele o app instalado não enxerga a versão nova.
// Aqui o release é criado uma vez só e os arquivos sobem um de cada vez.
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const { owner, repo } = pkg.build.publish.find((p) => p.provider === "github");
const version = pkg.version;
const tag = `v${version}`;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!token) fail("Defina GH_TOKEN com um token do GitHub (permissão Contents: Read and write).");

const exe = `Slash-Setup-${version}.exe`;
const files = [exe, `${exe}.blockmap`, "latest.yml"];
for (const name of files) {
  await stat(join(root, "release", name)).catch(() => fail(`Arquivo não encontrado: release/${name}`));
}
const latest = await readFile(join(root, "release", "latest.yml"), "utf8");
if (!latest.startsWith(`version: ${version}\n`)) fail(`release/latest.yml não é da versão ${version}.`);

// A tag aponta para o commit atual, que precisa já estar no GitHub.
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const head = git("rev-parse", "HEAD");
if (git("status", "--porcelain", "--untracked-files=no")) {
  fail("Há alterações sem commit. Faça commit e push antes de publicar.");
}
git("fetch", "--quiet", "origin");
if (!git("branch", "-r", "--contains", head)) fail("O commit atual ainda não está no GitHub. Rode git push antes.");

async function github(method, url, body, headers = {}) {
  const res = await fetch(url.startsWith("http") ? url : `https://api.github.com/repos/${owner}/${repo}${url}`, {
    method,
    body,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "slash-release",
      ...headers,
    },
  });
  if (!res.ok) fail(`GitHub respondeu ${res.status} em ${method} ${url}:\n${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const existing = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
  headers: { Authorization: `Bearer ${token}`, "User-Agent": "slash-release" },
});
if (existing.ok) fail(`O release ${tag} já existe. Aumente a versão no package.json.`);

console.log(`Criando o release ${tag} (${head.slice(0, 7)})...`);
const release = await github(
  "POST",
  "/releases",
  JSON.stringify({ tag_name: tag, target_commitish: head, name: version, draft: true }),
  { "Content-Type": "application/json" },
);

const uploadUrl = release.upload_url.replace(/\{.*\}$/, "");
for (const name of files) {
  const data = await readFile(join(root, "release", name));
  process.stdout.write(`Enviando ${name} (${(data.length / 1024 / 1024).toFixed(1)} MB)... `);
  await github("POST", `${uploadUrl}?name=${encodeURIComponent(name)}`, data, {
    "Content-Type": "application/octet-stream",
  });
  console.log("ok");
}

// Só publica depois que os três arquivos subiram: o app nunca vê um release pela metade.
await github("PATCH", `/releases/${release.id}`, JSON.stringify({ draft: false }), {
  "Content-Type": "application/json",
});
console.log(`\n✔ ${tag} publicado: https://github.com/${owner}/${repo}/releases/tag/${tag}\n`);
