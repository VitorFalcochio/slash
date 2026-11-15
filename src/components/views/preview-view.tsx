"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cover } from "@/components/document/cover";
import { DocTags } from "@/components/document/doc-tags";
import { Toolbar } from "@/components/document/toolbar";
import { usePageContent } from "@/lib/use-page-content";
import { useDocuments } from "@/store/documents";

const Editor = dynamic(() => import("@/components/editor/editor"), { ssr: false });

export function PreviewView() {
  const id = useSearchParams().get("id") ?? "";
  const hydrated = useDocuments((s) => s.hydrated);
  const doc = useDocuments((s) => s.docs[id]);
  const page = usePageContent(id);

  if (!hydrated) return null;

  if (!doc || !doc.isPublished || doc.isArchived) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-lg font-semibold">Esta página não está disponível</h2>
        <Link href="/" className="text-sm text-accent hover:underline">
          Ir para o Slash
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-40">
      <Cover cover={doc.coverImage} preview />
      <div className="doc-width mx-auto">
        <Toolbar doc={doc} preview />
        <DocTags doc={doc} preview />
        {page.status === "ready" && <Editor key={doc.id} initialContent={page.content} editable={false} />}
      </div>
    </div>
  );
}
