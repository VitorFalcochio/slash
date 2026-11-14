"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DocIcon, docTitle } from "@/components/doc-icon";
import { EmojiText } from "@/components/emoji-text";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useDocuments } from "@/store/documents";
import { useUi } from "@/store/ui";

export function SearchCommand() {
  const router = useRouter();
  const docs = useDocuments((s) => s.docs);
  const { searchOpen, setSearchOpen } = useUi();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSearchOpen(!useUi.getState().searchOpen);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  const results = Object.values(docs)
    .filter((d) => !d.isArchived)
    .filter((d) => docTitle(d.title).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 50);

  const close = () => {
    setSearchOpen(false);
    setQuery("");
    setSelected(0);
  };

  const open = (id: string) => {
    router.push(`/documents?id=${id}`);
    close();
  };

  return (
    <Modal open={searchOpen} onClose={close}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search className="size-5 text-muted" />
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
              setSelected((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[selected]) {
              open(results[selected].id);
            }
          }}
          placeholder="Buscar no Slash..."
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
      </div>
      <div className="max-h-[50vh] overflow-y-auto p-1.5">
        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nenhum resultado encontrado</p>
        ) : (
          <>
            <p className="px-2 py-1 text-xs font-medium text-muted">Páginas</p>
            {results.map((doc, i) => (
              <button
                key={doc.id}
                onMouseEnter={() => setSelected(i)}
                onClick={() => open(doc.id)}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm", i === selected && "bg-hover")}
              >
                <DocIcon icon={doc.icon} />
                <span className="truncate"><EmojiText text={docTitle(doc.title)} /></span>
              </button>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
