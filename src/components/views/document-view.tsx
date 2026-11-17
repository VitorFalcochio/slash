"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Cover } from "@/components/document/cover";
import { DocTags } from "@/components/document/doc-tags";
import { ArchivedBanner, Navbar } from "@/components/document/navbar";
import { Toolbar } from "@/components/document/toolbar";
import { LockScreen } from "@/components/lock/lock-screen";
import { useLock } from "@/lib/lock";
import { savePageContent } from "@/lib/page-content";
import { usePageContent } from "@/lib/use-page-content";
import { useEffect } from "react";
import { useDocuments, type Doc } from "@/store/documents";
import { useSettings } from "@/store/settings";

const Editor = dynamic(() => import("@/components/editor/editor"), { ssr: false });

export function DocumentView({ id }: { id: string }) {
  const doc = useDocuments((s) => s.docs[id]);
  const update = useDocuments((s) => s.update);
  const hydrated = useDocuments((s) => s.hydrated);
  const unlocked = useLock((s) => s.unlocked);
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

  // Página protegida e bloqueada: só o título aparece (sem capa, etiquetas nem conteúdo).
  if (doc.isLocked && !unlocked) {
    return (
      <div data-doc={doc.id} className="pb-40">
        <Navbar doc={doc} />
        {doc.isArchived && <ArchivedBanner doc={doc} />}
        <div className="doc-width mx-auto pt-12">
          <Toolbar doc={doc} preview />
          <LockScreen />
        </div>
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
        <PageBody doc={doc} />
      </div>
    </div>
  );
}

/**
 * O conteúdo fica num componente próprio para ser lido do disco de novo a cada desbloqueio
 * (o que foi digitado antes de bloquear já foi gravado, ver lib/lock.ts).
 */
function PageBody({ doc }: { doc: Doc }) {
  const update = useDocuments((s) => s.update);
  const page = usePageContent(doc.id);

  return (
    <>
      {page.status === "ready" && (
        <Editor
          key={doc.id}
          docId={doc.id}
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
    </>
  );
}
