"use client";

// Assistente de IA: o que a página precisa saber do Gemini (as chamadas em si ficam em electron/ai.cjs).
import type { BlockNoteEditor } from "@blocknote/core";
import { loadPageContent } from "./page-content";
import { useDocuments, type Doc } from "@/store/documents";
import { useSettings } from "@/store/settings";

/** Modelos oferecidos nas Configurações (nomes da documentação do Gemini, nov/2026). */
export const AI_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", hint: "Recomendado: rápido e equilibrado" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", hint: "Mais barato e mais rápido" },
  { id: "gemini-4-hydrogen", label: "Gemini 4 Hydrogen", hint: "Nova geração, rápido" },
  { id: "gemini-4-argon", label: "Gemini 4 Argon", hint: "Raciocínio mais forte, mais lento" },
] as const;

export function aiBridge() {
  return typeof window === "undefined" ? undefined : window.slashAI;
}

export function aiModel() {
  return useSettings.getState().aiModel || AI_MODELS[0].id;
}

// ---------- Conversão entre o conteúdo das páginas (blocos do BlockNote) e Markdown ----------

// Carregado só quando usado: o BlockNote mexe no DOM e não roda na geração estática do Next.
let converter: Promise<BlockNoteEditor> | null = null;
const getConverter = () => (converter ??= import("@blocknote/core").then((m) => m.BlockNoteEditor.create()));

export async function contentToMarkdown(content: string | null | undefined) {
  if (!content) return "";
  try {
    return (await getConverter()).blocksToMarkdownLossy(JSON.parse(content)).trim();
  } catch (error) {
    console.error("Falha ao converter página para texto", error);
    return "";
  }
}

/** Markdown → JSON de blocos, no formato salvo em lib/page-content.ts. */
export async function markdownToContent(markdown: string) {
  return JSON.stringify((await getConverter()).tryParseMarkdownToBlocks(markdown));
}

/** Markdown → blocos, para inserir num editor aberto. */
export async function markdownToBlocks(markdown: string) {
  return (await getConverter()).tryParseMarkdownToBlocks(markdown);
}

// ---------- Citações [[id-da-página]] ----------

export const CITATION_REGEX = /\[\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi;

/** Troca as citações por "(Título)" para o texto poder virar uma página. */
export function replaceCitations(markdown: string) {
  const { docs } = useDocuments.getState();
  return markdown.replace(CITATION_REGEX, (_, id: string) => {
    const doc = docs[id];
    return doc ? ` (${doc.title.trim() || "Sem título"})` : "";
  });
}

// ---------- Contexto: as anotações enviadas junto com cada pergunta ----------

/** ~100 mil tokens: cabe com folga no Gemini e mantém cada pergunta barata. */
const CORPUS_BUDGET = 400_000;

function pagePath(doc: Doc, docs: Record<string, Doc>) {
  const names: string[] = [];
  for (let d: Doc | undefined = doc; d; d = d.parentId ? docs[d.parentId] : undefined) {
    names.unshift(d.title.trim() || "Sem título");
  }
  return names.join(" / ");
}

const attr = (value: string) => value.replace(/"/g, "'").replace(/\s+/g, " ");

export type Corpus = { text: string; included: number; total: number };

/**
 * Junta o texto das páginas (a aberta primeiro, depois as editadas mais recentemente) até o limite.
 * Cada página vai marcada com o id, para a IA poder citar a fonte.
 */
export async function buildCorpus(currentId?: string | null): Promise<Corpus> {
  const { docs, tags } = useDocuments.getState();
  const pages = Object.values(docs)
    .filter((d) => !d.isArchived)
    .sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId) || b.updatedAt - a.updatedAt);

  const contents = await Promise.all(pages.map((d) => loadPageContent(d.id).catch(() => null)));
  const bodies = await Promise.all(pages.map((d, i) => contentToMarkdown(contents[i] ?? d.content)));
  const parts: string[] = [];
  let size = 0;
  pages.forEach((doc, i) => {
    const body = bodies[i];
    const tagNames = (doc.tagIds ?? []).map((t) => tags[t]?.name).filter(Boolean).join(", ");
    const part =
      `<pagina id="${doc.id}" titulo="${attr(doc.title.trim() || "Sem título")}" caminho="${attr(pagePath(doc, docs))}"` +
      `${tagNames ? ` etiquetas="${attr(tagNames)}"` : ""} editada="${new Date(doc.updatedAt).toISOString().slice(0, 10)}">\n` +
      `${body || "(vazia)"}\n</pagina>`;
    if (size + part.length > CORPUS_BUDGET) return;
    parts.push(part);
    size += part.length;
  });
  return { text: parts.join("\n\n"), included: parts.length, total: pages.length };
}

export function assistantSystemPrompt(corpus: Corpus, currentId?: string | null) {
  const { docs } = useDocuments.getState();
  const current = currentId ? docs[currentId] : undefined;
  return [
    "Você é o assistente do Slash, um aplicativo de anotações. Responda sempre em português do Brasil, de forma direta e organizada.",
    "Use as anotações do usuário (abaixo, entre <anotacoes>) como fonte principal.",
    "Sempre que usar informação de uma página, cite-a logo depois do trecho escrevendo [[ID]], com o id exato da página (atributo id). Não invente ids.",
    "Se as anotações não tiverem a resposta, diga isso claramente. Você pode complementar com conhecimento geral, deixando claro o que não veio das anotações.",
    "Formate com Markdown simples: títulos com ##, listas com -, **negrito**. Sem tabelas.",
    `Hoje é ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`,
    current ? `O usuário está com a página "${current.title.trim() || "Sem título"}" (id ${current.id}) aberta agora.` : "",
    corpus.included < corpus.total
      ? `Atenção: por limite de tamanho, só ${corpus.included} de ${corpus.total} páginas foram incluídas (as mais recentes).`
      : "",
    `<anotacoes>\n${corpus.text || "(nenhuma página ainda)"}\n</anotacoes>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
