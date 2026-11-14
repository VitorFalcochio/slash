import { Fragment } from "react";
import { appleEmojiUrl, EMOJI_REGEX } from "@/lib/emoji";

/**
 * Texto com os emojis desenhados com as imagens da Apple. O caractere continua no DOM
 * (transparente), então seleção, cópia e quebra de linha funcionam normalmente.
 */
export function EmojiText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(EMOJI_REGEX)) {
    const url = appleEmojiUrl(match[0]);
    if (!url) continue;
    parts.push(text.slice(last, match.index));
    parts.push(
      <span key={match.index} className="apple-emoji" style={{ backgroundImage: `url("${url}")` }}>
        {match[0]}
      </span>,
    );
    last = match.index! + match[0].length;
  }
  parts.push(text.slice(last));
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}
