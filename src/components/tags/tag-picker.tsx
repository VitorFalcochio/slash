"use client";

import { Check, Plus, Search } from "lucide-react";
import { useState } from "react";
import { randomTagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { sortByName, useDocuments } from "@/store/documents";
import { TagDot } from "./tag-chip";

/** Lista de etiquetas com busca: marca/desmarca na página e cria uma nova pelo nome digitado. */
export function TagPicker({ docId }: { docId: string }) {
  const tags = useDocuments((s) => s.tags);
  const doc = useDocuments((s) => s.docs[docId]);
  const { createTag, addTagToDoc, removeTagFromDoc } = useDocuments();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const q = query.trim();
  const all = sortByName(Object.values(tags));
  const results = all.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const exact = all.some((t) => t.name.toLowerCase() === q.toLowerCase());
  const canCreate = q.length > 0 && !exact;
  const total = results.length + (canCreate ? 1 : 0);
  const applied = new Set(doc?.tagIds ?? []);

  const toggle = (tagId: string) =>
    applied.has(tagId) ? removeTagFromDoc(docId, tagId) : addTagToDoc(docId, tagId);

  const createFromQuery = () => {
    addTagToDoc(docId, createTag(q, randomTagColor()));
    setQuery("");
    setSelected(0);
  };

  const choose = (index: number) => {
    if (index < results.length) toggle(results[index].id);
    else if (canCreate) createFromQuery();
  };

  return (
    <div className="w-64 text-sm">
      <div className="flex items-center gap-2 rounded-md bg-hover px-2 py-1.5">
        <Search className="size-4 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((i) => Math.min(i + 1, total - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && total > 0) {
              e.preventDefault();
              choose(selected);
            }
          }}
          placeholder="Buscar ou criar etiqueta"
          className="flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </div>

      <div className="mt-1 max-h-64 overflow-y-auto">
        {total === 0 && <p className="px-2 py-4 text-center text-xs text-muted">Digite um nome para criar uma etiqueta</p>}
        {results.map((tag, i) => (
          <button
            key={tag.id}
            onMouseEnter={() => setSelected(i)}
            onClick={() => toggle(tag.id)}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left", i === selected && "bg-hover")}
          >
            <TagDot color={tag.color} />
            <span className="flex-1 truncate">{tag.name}</span>
            {applied.has(tag.id) && <Check className="size-4 text-accent" />}
          </button>
        ))}
        {canCreate && (
          <button
            onMouseEnter={() => setSelected(results.length)}
            onClick={createFromQuery}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
              selected === results.length && "bg-hover",
            )}
          >
            <Plus className="size-4 text-muted" />
            <span className="truncate">
              Criar <span className="font-medium">&ldquo;{q}&rdquo;</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
