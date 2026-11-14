import { appleEmojiUrl } from "@/lib/emoji";
import { cn } from "@/lib/utils";

export function AppleEmoji({ emoji, size = 18, className }: { emoji: string; size?: number; className?: string }) {
  const url = appleEmojiUrl(emoji);

  if (!url) {
    return (
      <span className={cn("leading-none", className)} style={{ fontSize: size }}>
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagens locais estáticas, sem otimização
    <img
      src={url}
      alt={emoji}
      width={size}
      height={size}
      draggable={false}
      className={cn("inline-block shrink-0 select-none", className)}
    />
  );
}
