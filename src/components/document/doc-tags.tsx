"use client";

import { Tag as TagIcon } from "lucide-react";
import { TagChip } from "@/components/tags/tag-chip";
import { TagPicker } from "@/components/tags/tag-picker";
import { Popover } from "@/components/ui/popover";
import { docTags, useDocuments, type Doc } from "@/store/documents";

/** Linha de etiquetas logo abaixo do título da página. */
export function DocTags({ doc, preview }: { doc: Doc; preview?: boolean }) {
  const tags = useDocuments((s) => s.tags);
  const removeTagFromDoc = useDocuments((s) => s.removeTagFromDoc);
  const applied = docTags(doc, tags);

  if (preview) {
    if (applied.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 px-[54px] pb-4">
        {applied.map((tag) => (
          <TagChip key={tag.id} tag={tag} />
        ))}
      </div>
    );
  }

  return (
    <div className="group/tags flex flex-wrap items-center gap-1.5 px-[54px] pb-4">
      {applied.map((tag) => (
        <TagChip key={tag.id} tag={tag} onRemove={() => removeTagFromDoc(doc.id, tag.id)} />
      ))}
      <Popover
        trigger={(
          <button
            className={
              applied.length === 0
                ? "flex h-6 items-center gap-1.5 rounded-md px-1.5 text-sm text-muted opacity-60 transition hover:bg-hover group-hover/tags:opacity-100"
                : "flex h-6 items-center gap-1 rounded-full px-2 text-xs text-muted opacity-0 transition hover:bg-hover group-hover/tags:opacity-100"
            }
          >
            <TagIcon className="size-3.5" />
            {applied.length === 0 ? "Adicionar etiqueta" : "Etiqueta"}
          </button>
        )}
      >
        {() => <TagPicker docId={doc.id} />}
      </Popover>
    </div>
  );
}
