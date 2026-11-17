"use client";

import { toast } from "sonner";
import { markdownToContent, replaceCitations } from "@/lib/ai";
import { insertMarkdownAtTop } from "@/lib/editor-registry";
import { writePageContent } from "@/lib/page-content";
import { useAssistant } from "@/store/assistant";
import { useDocuments, type Doc } from "@/store/documents";
import { useUi } from "@/store/ui";

/** Abre o assistente e pede o resumo da página (a resposta ganha o botão "Inserir no topo"). */
export function summarizePage(doc: Doc) {
  const title = doc.title.trim() || "Sem título";
  useUi.getState().setAssistantOpen(true);
  void useAssistant.getState().ask(
    `Resuma a página de id ${doc.id} ("${title}"). Comece com uma frase dizendo do que ela trata e depois liste os pontos principais em tópicos curtos. Responda só com o resumo: sem título e sem citar a própria página.`,
    { display: `Resumir "${title}"`, insertInto: doc.id, currentId: doc.id },
  );
}

const plain = (line: string) => line.replace(/^#+\s*/, "").replace(/[*`_]/g, "").trim();

/** Cria uma página nova com a resposta do assistente e devolve o id dela. */
export async function createPageFromAnswer(markdown: string) {
  const lines = markdown.trim().split("\n");
  const headingTitle = /^#{1,3}\s+/.test(lines[0] ?? "");
  const title = (headingTitle ? plain(lines[0]) : plain(lines[0] ?? "").slice(0, 60)) || "Anotações do assistente";
  const body = headingTitle ? lines.slice(1).join("\n") : markdown;

  const { create, update } = useDocuments.getState();
  const id = create(null, title);
  update(id, { icon: "✨" });
  await writePageContent(id, await markdownToContent(replaceCitations(body)));
  toast.success("Página criada");
  return id;
}

/** Coloca o resumo no começo da página, com um título "Resumo". */
export async function insertSummary(docId: string, markdown: string) {
  await insertMarkdownAtTop(docId, `### Resumo\n\n${replaceCitations(markdown).trim()}\n`);
  toast.success("Resumo inserido no topo da página");
}
