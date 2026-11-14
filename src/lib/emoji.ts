import available from "@/generated/apple-emoji.json";

const AVAILABLE = new Set(available as string[]);

/** Sequências de emoji completas (incluindo ZWJ, tons de pele e bandeiras). */
export const EMOJI_REGEX = new RegExp("\\p{RGI_Emoji}", "gv");

export function toUnified(emoji: string) {
  return [...emoji].map((c) => c.codePointAt(0)!.toString(16)).join("-");
}

/** URL da imagem da Apple para um emoji, ou null se não houver imagem (usa o emoji do sistema). */
export function appleEmojiUrl(emoji: string) {
  return appleEmojiUrlByUnified(toUnified(emoji));
}

export function appleEmojiUrlByUnified(unified: string) {
  const full = unified.toLowerCase();
  if (AVAILABLE.has(full)) return `/emoji/apple/64/${full}.png`;
  // Algumas imagens são nomeadas sem o seletor de variação (fe0f).
  const stripped = full
    .split("-")
    .filter((p) => p !== "fe0f")
    .join("-");
  if (AVAILABLE.has(stripped)) return `/emoji/apple/64/${stripped}.png`;
  return null;
}
