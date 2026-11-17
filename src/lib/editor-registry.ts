"use client";

// Editores abertos agora, por página. Usado para o assistente inserir texto na página que está na tela
// (gravar direto no arquivo seria sobrescrito pelo próximo salvamento do editor aberto).
import type { BlockNoteEditor } from "@blocknote/core";
import { flushPageContent, loadPageContent, writePageContent } from "./page-content";
import { markdownToBlocks, markdownToContent } from "./ai";
import { useDocuments } from "@/store/documents";

const editors = new Map<string, BlockNoteEditor>();

/** Registra o editor da página; devolve a função que remove o registro. */
export function registerEditor(docId: string, editor: BlockNoteEditor) {
  editors.set(docId, editor);
  return () => {
    if (editors.get(docId) === editor) editors.delete(docId);
  };
}

/** Insere Markdown no começo da página: no editor, se ela estiver aberta; senão, no arquivo. */
export async function insertMarkdownAtTop(docId: string, markdown: string) {
  const editor = editors.get(docId);
  if (editor) {
    const blocks = await markdownToBlocks(markdown);
    const first = editor.document[0];
    if (first) editor.insertBlocks(blocks, first, "before");
    else editor.replaceBlocks(editor.document, blocks);
    return;
  }
  flushPageContent(docId);
  const current = await loadPageContent(docId);
  const existing = current ? (JSON.parse(current) as unknown[]) : [];
  const added = JSON.parse(await markdownToContent(markdown)) as unknown[];
  await writePageContent(docId, JSON.stringify([...added, ...existing]));
  useDocuments.getState().update(docId, {});
}
