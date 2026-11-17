import type { CSSProperties } from "react";
import { tagColorValue } from "@/lib/tag-colors";

/** Fundo suave na cor do evento com uma faixa à esquerda (legível no tema claro e escuro). */
export function eventStyle(color: string, faded = false): CSSProperties {
  const value = tagColorValue(color);
  return {
    background: `color-mix(in srgb, ${value} ${faded ? 10 : 22}%, var(--background))`,
    borderLeft: `3px solid ${value}`,
  };
}

export function eventTitle(title: string) {
  return title.trim() || "(Sem título)";
}
