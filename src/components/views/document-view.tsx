"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Cover } from "@/components/document/cover";
import { ArchivedBanner, Navbar } from "@/components/document/navbar";
import { Toolbar } from "@/components/document/toolbar";
import { useDocuments } from "@/store/documents";

const Editor = dynamic(() => import("@/components/editor/editor"), { ssr: false });

export function DocumentView({ id }: { id: string }) {
  const doc = useDocuments((s) => s.docs[id]);
  const update = useDocuments((s) => s.update);
  const hydrated = useDocuments((s) => s.hydrated);

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
      <div className="mx-auto max-w-[900px]">
        <Toolbar doc={doc} />
        <Editor
          key={doc.id}
          initialContent={doc.content}
          onChange={(content) => update(doc.id, { content })}
        />
      </div>
    </div>
  );
}
