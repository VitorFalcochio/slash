"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Cover } from "@/components/document/cover";
import { DocTags } from "@/components/document/doc-tags";
import { ArchivedBanner, Navbar } from "@/components/document/navbar";
import { Toolbar } from "@/components/document/toolbar";
import { savePageContent } from "@/lib/page-content";
import { usePageContent } from "@/lib/use-page-content";
import { useEffect } from "react";
import { useDocuments } from "@/store/documents";
import { useSettings } from "@/store/settings";

const Editor = dynamic(() => import("@/components/editor/editor"), { ssr: false });

export function DocumentView({ id }: { id: string }) {
  const doc = useDocuments((s) => s.docs[id]);
  const update = useDocuments((s) => s.update);
  const hydrated = useDocuments((s) => s.hydrated);
  const page = usePageContent(id);
  const exists = Boolean(doc && !doc.isArchived);

  useEffect(() => {
    if (exists) useSettings.getState().set({ lastPageId: id });
  }, [exists, id]);

  if (!hydrated) return null;

  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="titlebar fixed inset-x-0 top-0 h-11" />
        <h2 className="text-lg font-semibold">Página não encontrada</h2>
        <Link href="/documents" className="text-sm text-accent hover:underline">
          Voltar para o início
        </Link>
      </div>
    );
  }

  return (
    <div data-doc={doc.id} className="pb-40">
      <Navbar doc={doc} />
      {doc.isArchived && <ArchivedBanner doc={doc} />}
      <Cover cover={doc.coverImage} onChange={(coverImage) => update(doc.id, { coverImage })} />
      <div className="doc-width mx-auto">
        <Toolbar doc={doc} />
        <DocTags doc={doc} />
        {page.status === "ready" && (
          <Editor
            key={doc.id}
            initialContent={page.content}
            onChange={(serialize) =>
              // Depois da pausa, grava o arquivo da página e atualiza a data de edição
              // (e descarta o conteúdo antigo do arquivo principal, se ainda estiver lá).
              savePageContent(doc.id, serialize, () =>
                update(doc.id, doc.content === undefined ? {} : { content: undefined }),
              )
            }
          />
        )}
        {page.status === "error" && (
          <p className="px-[54px] text-sm text-red-500">
            Não foi possível abrir o conteúdo desta página. Para não perder nada, ela não será editada agora.
          </p>
        )}
      </div>
    </div>
  );
}
