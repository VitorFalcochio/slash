"use client";

import { ImageIcon, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { saveUpload } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const COVER_GRADIENTS = [
  "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
  "linear-gradient(135deg, #434343 0%, #000000 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
];

export function randomCover() {
  return COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)];
}

function coverStyle(cover: string) {
  return cover.startsWith("linear-gradient")
    ? { backgroundImage: cover }
    : { backgroundImage: `url("${cover}")`, backgroundSize: "cover", backgroundPosition: "center" };
}

export function Cover({
  cover,
  onChange,
  preview,
}: {
  cover?: string;
  onChange?: (cover: string | undefined) => void;
  preview?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("A imagem deve ter no máximo 20 MB");
    onChange?.(await saveUpload(file));
  };

  return (
    <div className={cn("group relative w-full", cover ? "h-[30vh] max-h-[280px]" : "h-12")}>
      {cover && <div className="absolute inset-0" style={coverStyle(cover)} />}
      {cover && !preview && (
        <div className="absolute right-4 bottom-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={() => onChange?.(randomCover())}
            className="rounded-md bg-background/90 px-2 py-1 text-xs text-foreground/80 hover:bg-background"
          >
            Aleatória
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground/80 hover:bg-background"
          >
            <ImageIcon className="size-3.5" /> Alterar capa
          </button>
          <button
            onClick={() => onChange?.(undefined)}
            className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground/80 hover:bg-background"
          >
            <X className="size-3.5" /> Remover
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
