"use client";

import { ChevronRight, MoreHorizontal, Plus, Star, StarOff, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DocIcon, docTitle } from "@/components/doc-icon";
import { EmojiText } from "@/components/emoji-text";
import { MenuItem, Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { sortDocs, useDocuments, type Doc } from "@/store/documents";

export function DocTree({ parentId, level = 0 }: { parentId: string | null; level?: number }) {
  const docs = useDocuments((s) => s.docs);
  const children = sortDocs(Object.values(docs).filter((d) => d.parentId === parentId && !d.isArchived));

  if (level > 0 && children.length === 0) {
    return (
      <p className="py-1 text-sm text-muted" style={{ paddingLeft: 12 + level * 12 + 22 }}>
        Sem páginas dentro
      </p>
    );
  }

  return children.map((doc) => <DocItem key={doc.id} doc={doc} level={level} />);
}

export function DocItem({ doc, level, flat }: { doc: Doc; level: number; flat?: boolean }) {
  const router = useRouter();
  const activeId = useSearchParams().get("id");
  const { create, update, archive } = useDocuments();
  const [expanded, setExpanded] = useState(false);
  const active = activeId === doc.id;

  const onCreateChild = () => {
    const id = create(doc.id);
    setExpanded(true);
    router.push(`/documents?id=${id}`);
  };

  const onArchive = () => {
    archive(doc.id);
    toast.success("Página movida para a lixeira");
    if (active) router.push("/documents");
  };

  return (
    <>
      <div
        role="button"
        onClick={() => router.push(`/documents?id=${doc.id}`)}
        style={{ paddingLeft: 8 + level * 12 }}
        className={cn(
          "group flex h-[30px] items-center gap-1 rounded-md pr-1 text-sm text-foreground/80 hover:bg-hover",
          active && "bg-hover font-medium text-foreground",
        )}
      >
        {!flat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
          </button>
        )}
        <span className="flex size-5 shrink-0 items-center justify-center text-[15px]">
          <DocIcon icon={doc.icon} />
        </span>
        <span className="flex-1 truncate"><EmojiText text={docTitle(doc.title)} /></span>

        <div className="flex items-center opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <Popover
            align="start"
            trigger={(
              <button className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover">
                <MoreHorizontal className="size-4" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={doc.isFavorite ? <StarOff /> : <Star />}
                  onClick={() => {
                    update(doc.id, { isFavorite: !doc.isFavorite });
                    close();
                  }}
                >
                  {doc.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                </MenuItem>
                <MenuItem icon={<Trash2 />} danger onClick={onArchive}>
                  Mover para a lixeira
                </MenuItem>
                <div className="mt-1 border-t border-border px-2 pt-1.5 pb-0.5 text-xs text-muted">
                  Editado em {new Date(doc.updatedAt).toLocaleString("pt-BR")}
                </div>
              </>
            )}
          </Popover>
          {!flat && (
            <button
              onClick={onCreateChild}
              className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover"
              aria-label="Adicionar página dentro"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>
      {!flat && expanded && <DocTree parentId={doc.id} level={level + 1} />}
    </>
  );
}
