"use client";

import { ImageIcon, Smile } from "lucide-react";
import { useEffect, useRef } from "react";
import { AppleEmoji } from "@/components/apple-emoji";
import { EmojiText } from "@/components/emoji-text";
import { cn } from "@/lib/utils";
import { useDocuments, type Doc } from "@/store/documents";
import { randomCover } from "./cover";
import { IconPicker } from "./icon-picker";

const TITLE_CLASS = "pt-2 pb-3 text-[40px] leading-tight font-bold break-words";

export function Toolbar({ doc, preview }: { doc: Doc; preview?: boolean }) {
  const update = useDocuments((s) => s.update);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Ajusta a altura do título conforme o texto quebra linha.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [doc.title]);

  return (
    <div className={cn("group relative px-[54px]", doc.icon && (doc.coverImage ? "-mt-10" : "mt-4"))}>
      {doc.icon &&
        (preview ? (
          <AppleEmoji emoji={doc.icon} size={78} />
        ) : (
          <IconPicker onChange={(icon) => update(doc.id, { icon })} onRemove={() => update(doc.id, { icon: undefined })}>
                          <button className="rounded-lg p-1 hover:bg-hover">
                <AppleEmoji emoji={doc.icon} size={78} />
              </button>
          </IconPicker>
        ))}

      {!preview && (
        <div className="flex h-9 items-center gap-1 pt-2 text-sm text-muted opacity-0 transition group-hover:opacity-100">
          {!doc.icon && (
            <IconPicker onChange={(icon) => update(doc.id, { icon })}>
                              <button className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-hover">
                  <Smile className="size-4" /> Adicionar ícone
                </button>
            </IconPicker>
          )}
          {!doc.coverImage && (
            <button
              onClick={() => update(doc.id, { coverImage: randomCover() })}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-hover"
            >
              <ImageIcon className="size-4" /> Adicionar capa
            </button>
          )}
        </div>
      )}

      {preview ? (
        <h1 className={TITLE_CLASS}>
          <EmojiText text={doc.title || "Sem título"} />
        </h1>
      ) : (
        // O textarea fica com o texto transparente; a camada de trás desenha o mesmo texto
        // com os emojis da Apple, alinhada letra a letra.
        <div className="relative">
          <div aria-hidden className={cn(TITLE_CLASS, "pointer-events-none absolute inset-0 whitespace-pre-wrap")}>
            <EmojiText text={doc.title} />
          </div>
          <textarea
            ref={titleRef}
            rows={1}
            value={doc.title}
            placeholder="Sem título"
            onChange={(e) => update(doc.id, { title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                // Pula para o editor ao apertar Enter no título.
                e.currentTarget.closest("[data-doc]")?.querySelector<HTMLElement>(".bn-editor")?.focus();
              }
            }}
            className={cn(
              TITLE_CLASS,
              "relative block w-full resize-none overflow-hidden bg-transparent text-transparent caret-foreground outline-none placeholder:text-foreground/20",
            )}
          />
        </div>
      )}
    </div>
  );
}
