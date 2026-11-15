"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocIcon, docTitle } from "@/components/doc-icon";
import { EmojiText } from "@/components/emoji-text";
import { TagChip, TagDot } from "@/components/tags/tag-chip";
import { docTags, useDocuments } from "@/store/documents";
import { useUi } from "@/store/ui";

/** Todas as páginas que têm a etiqueta, das editadas mais recentemente para as mais antigas. */
export function TagView({ id }: { id: string }) {
  const router = useRouter();
  const tag = useDocuments((s) => s.tags[id]);
  const tags = useDocuments((s) => s.tags);
  const docs = useDocuments((s) => s.docs);
  const { sidebarCollapsed, setSidebarCollapsed } = useUi();

  const header = (
    <div className="titlebar sticky top-0 z-40 flex h-11 shrink-0 items-center bg-background px-3">
      {sidebarCollapsed && (
        <button onClick={() => setSidebarCollapsed(false)} className="rounded p-1 text-muted hover:bg-hover" aria-label="Abrir barra lateral">
          <Menu className="size-5" />
        </button>
      )}
    </div>
  );

  if (!tag) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-11 text-center">
          <h2 className="text-lg font-semibold">Etiqueta não encontrada</h2>
          <Link href="/documents" className="text-sm text-accent hover:underline">
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  const list = Object.values(docs)
    .filter((d) => !d.isArchived && d.tagIds?.includes(id))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex min-h-full flex-col">
      {header}
      <div className="doc-width mx-auto w-full px-[54px] pt-10 pb-40">
        <div className="flex items-center gap-3">
          <TagDot color={tag.color} className="size-4" />
          <h1 className="truncate text-[32px] leading-tight font-bold">{tag.name}</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          {list.length === 0 ? "Nenhuma página" : `${list.length} página${list.length > 1 ? "s" : ""}`}
        </p>

        <div className="mt-6 border-t border-border">
          {list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">
              Aplique esta etiqueta abaixo do título de uma página, ou arraste a página até a etiqueta na barra lateral.
            </p>
          )}
          {list.map((doc) => (
            <button
              key={doc.id}
              onClick={() => router.push(`/documents?id=${doc.id}`)}
              className="flex w-full items-center gap-3 border-b border-border px-2 py-2.5 text-left text-sm hover:bg-hover"
            >
              <DocIcon icon={doc.icon} />
              <span className="min-w-0 flex-1 truncate font-medium">
                <EmojiText text={docTitle(doc.title)} />
              </span>
              <span className="hidden min-w-0 shrink items-center gap-1 overflow-hidden md:flex">
                {docTags(doc, tags)
                  .filter((t) => t.id !== id)
                  .slice(0, 3)
                  .map((t) => (
                    <TagChip key={t.id} tag={t} />
                  ))}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {new Date(doc.updatedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
