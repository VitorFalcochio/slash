"use client";

import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TagDot } from "@/components/tags/tag-chip";
import { InlineRename } from "@/components/ui/inline-rename";
import { MenuItem, Popover } from "@/components/ui/popover";
import { DRAG_DOC, dragHas } from "@/lib/dnd";
import { TAG_COLORS } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { sortByName, useDocuments, type Tag } from "@/store/documents";

export function TagList({ renamingId, setRenamingId }: { renamingId: string | null; setRenamingId: (id: string | null) => void }) {
  const tags = useDocuments((s) => s.tags);
  const docs = useDocuments((s) => s.docs);
  const list = sortByName(Object.values(tags));

  const counts: Record<string, number> = {};
  for (const doc of Object.values(docs)) {
    if (doc.isArchived) continue;
    for (const id of doc.tagIds ?? []) counts[id] = (counts[id] ?? 0) + 1;
  }

  if (list.length === 0) {
    return <p className="px-2 py-1 text-sm text-muted">Nenhuma etiqueta ainda</p>;
  }

  return list.map((tag) => (
    <TagItem
      key={tag.id}
      tag={tag}
      count={counts[tag.id] ?? 0}
      renaming={renamingId === tag.id}
      onRename={() => setRenamingId(tag.id)}
      onRenameDone={() => setRenamingId(null)}
    />
  ));
}

function TagItem({
  tag,
  count,
  renaming,
  onRename,
  onRenameDone,
}: {
  tag: Tag;
  count: number;
  renaming: boolean;
  onRename: () => void;
  onRenameDone: () => void;
}) {
  const router = useRouter();
  const activeTag = useSearchParams().get("tag");
  const { updateTag, deleteTag, addTagToDoc } = useDocuments();
  const [dropOver, setDropOver] = useState(false);
  const active = activeTag === tag.id;

  const onDelete = () => {
    const extra = count > 0 ? ` Ela será removida de ${count} página${count > 1 ? "s" : ""}.` : "";
    if (!confirm(`Excluir a etiqueta "${tag.name}"?${extra}`)) return;
    deleteTag(tag.id);
    toast.success("Etiqueta excluída");
    if (active) router.push("/documents");
  };

  return (
    <div
      role="button"
      onClick={() => !renaming && router.push(`/documents?tag=${tag.id}`)}
      onDragOver={(e) => {
        if (!dragHas(e, DRAG_DOC)) return;
        e.preventDefault();
        setDropOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDropOver(false);
        const docId = e.dataTransfer.getData(DRAG_DOC);
        if (docId) {
          addTagToDoc(docId, tag.id);
          toast.success(`Etiqueta "${tag.name}" aplicada`);
        }
      }}
      className={cn(
        "group flex h-[30px] items-center gap-1 rounded-md pr-1 pl-2 text-sm text-foreground/80 hover:bg-hover",
        active && "bg-hover font-medium text-foreground",
        dropOver && "bg-accent/15 ring-1 ring-accent ring-inset",
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        <TagDot color={tag.color} className="size-2.5" />
      </span>

      {renaming ? (
        <InlineRename
          initial={tag.name}
          onDone={(name) => {
            if (name) updateTag(tag.id, { name });
            onRenameDone();
          }}
        />
      ) : (
        <span className="flex-1 truncate">{tag.name}</span>
      )}

      {!renaming && (
        <>
          {count > 0 && <span className="text-xs text-muted group-hover:hidden">{count}</span>}
          <div className="hidden items-center group-hover:flex" onClick={(e) => e.stopPropagation()}>
            <Popover
              align="start"
              trigger={(
                <button className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover" aria-label="Opções da etiqueta">
                  <MoreHorizontal className="size-4" />
                </button>
              )}
            >
              {(close) => (
                <>
                  <MenuItem icon={<Pencil />} onClick={() => { onRename(); close(); }}>
                    Renomear
                  </MenuItem>
                  <div className="mt-1 border-t border-border px-2 pt-1.5 pb-1 text-xs text-muted">Cor</div>
                  {TAG_COLORS.map((c) => (
                    <MenuItem key={c.id} icon={<TagDot color={c.id} className="size-3" />} onClick={() => updateTag(tag.id, { color: c.id })}>
                      <span className="flex-1">{c.name}</span>
                      {tag.color === c.id && <Check className="size-4 text-accent" />}
                    </MenuItem>
                  ))}
                  <div className="mt-1 border-t border-border pt-1">
                    <MenuItem icon={<Trash2 />} danger onClick={() => { close(); onDelete(); }}>
                      Excluir etiqueta
                    </MenuItem>
                  </div>
                </>
              )}
            </Popover>
          </div>
        </>
      )}
    </div>
  );
}
