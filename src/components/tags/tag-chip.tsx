import { X } from "lucide-react";
import { tagColorValue } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import type { Tag } from "@/store/documents";

export function TagDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ background: tagColorValue(color) }}
    />
  );
}

/** Etiqueta em formato de pílula, com fundo na cor da etiqueta (funciona no tema claro e escuro). */
export function TagChip({ tag, onRemove, className }: { tag: Tag; onRemove?: () => void; className?: string }) {
  const color = tagColorValue(tag.color);
  return (
    <span
      className={cn("inline-flex h-6 max-w-48 items-center gap-1.5 rounded-full px-2 text-xs font-medium", className)}
      style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
    >
      <TagDot color={tag.color} />
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-1 rounded-full p-0.5 text-muted hover:bg-hover hover:text-foreground"
          aria-label={`Remover etiqueta ${tag.name}`}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
