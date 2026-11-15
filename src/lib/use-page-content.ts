"use client";

import { useEffect, useState } from "react";
import { useDocuments } from "@/store/documents";
import { flushPageContent, loadPageContent } from "./page-content";

type PageContent = { status: "loading" } | { status: "ready"; content?: string } | { status: "error" };

/** Carrega o conteúdo da página quando ela é aberta; ao sair, grava o que estava esperando a pausa. */
export function usePageContent(id: string): PageContent {
  const [state, setState] = useState<PageContent>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    loadPageContent(id)
      .then((content) => {
        // Se a migração não rodou, o conteúdo antigo ainda está no store.
        const legacy = useDocuments.getState().docs[id]?.content;
        if (alive) setState({ status: "ready", content: content ?? legacy ?? undefined });
      })
      .catch((error) => {
        console.error("Falha ao abrir a página", error);
        if (alive) setState({ status: "error" });
      });
    return () => {
      alive = false;
      flushPageContent(id);
    };
  }, [id]);

  return state;
}
