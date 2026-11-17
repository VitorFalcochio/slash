"use client";

import { Search, Trash, Undo2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DocIcon, docTitle } from "@/components/doc-icon";
import { EmojiText } from "@/components/emoji-text";
import { useDocuments } from "@/store/documents";

export function TrashBox({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const activeId = useSearchParams().get("id");
  const { docs, restore, remove } = useDocuments();
  const [query, setQuery] = useState("");

  // Só a raiz de cada grupo arquivado; subpáginas vêm junto.
  const roots = Object.values(docs).filter((d) => d.isArchived && (!d.parentId || !docs[d.parentId]?.isArchived));
  const archived = roots
    .filter((d) => docTitle(d.title).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const onRemove = (id: string) => {
    if (!confirm("Excluir esta página permanentemente? Essa ação não pode ser desfeita.")) return;
    remove(id);
    toast.success("Página excluída");
    if (activeId === id) router.push("/documents");
  };

  // Esvazia tudo, mesmo o que a busca estiver escondendo.
  const onEmpty = () => {
    const total = Object.values(docs).filter((d) => d.isArchived).length;
    if (!confirm(`Excluir permanentemente ${total === 1 ? "1 página" : `${total} páginas`} da lixeira? Essa ação não pode ser desfeita.`)) return;
    for (const doc of roots) remove(doc.id);
    toast.success("Lixeira esvaziada");
    if (activeId && !useDocuments.getState().docs[activeId]) router.push("/documents");
  };

  return (
    <div className="w-80 text-sm">
      <div className="flex items-center gap-2 rounded-md bg-hover px-2 py-1.5">
        <Search className="size-4 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar páginas na lixeira"
          className="flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </div>
      <div className="mt-1 max-h-72 overflow-y-auto">
        {archived.length === 0 && <p className="py-6 text-center text-muted">Nenhuma página na lixeira</p>}
        {archived.map((doc) => (
          <div
            key={doc.id}
            role="button"
            onClick={() => {
              router.push(`/documents?id=${doc.id}`);
              onNavigate();
            }}
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-hover"
          >
            <DocIcon icon={doc.icon} />
            <span className="flex-1 truncate"><EmojiText text={docTitle(doc.title)} /></span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                restore(doc.id);
                toast.success("Página restaurada");
              }}
              className="rounded p-1 text-muted hover:bg-hover"
              aria-label="Restaurar"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(doc.id);
              }}
              className="rounded p-1 text-muted hover:bg-hover hover:text-red-500"
              aria-label="Excluir permanentemente"
            >
              <Trash className="size-4" />
            </button>
          </div>
        ))}
      </div>
      {roots.length > 0 && (
        <div className="mt-1 border-t border-border pt-1">
          <button
            onClick={onEmpty}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-muted hover:bg-hover hover:text-red-500"
          >
            <Trash className="size-4" />
            Esvaziar lixeira
          </button>
        </div>
      )}
    </div>
  );
}
