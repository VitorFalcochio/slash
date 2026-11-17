"use client";

import dynamic from "next/dynamic";
import { EmojiStyle, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { Popover } from "@/components/ui/popover";
import { appleEmojiUrlByUnified } from "@/lib/emoji";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

// Nomes dos emojis em português (vem com a biblioteca): a busca entende "coração", "feliz", "fogo"...
const loadPortuguese = () => import("emoji-picker-react/data/emojis-pt").then((m) => m.default);

const LABELS = {
  searchPlaceholder: "Buscar emoji",
  searchLabel: "Buscar emoji",
  searchClear: "Limpar",
  searchResultsNone: "Nenhum emoji encontrado",
  searchResultsOne: "1 emoji encontrado",
  searchResultsMany: "%n emojis encontrados",
  categoryNavigation: "Categorias",
  loading: "Carregando...",
  loadingError: "Não foi possível carregar os emojis",
  retryLoading: "Tentar de novo",
  skinToneNeutral: "Tom de pele neutro",
  skinToneLight: "Tom de pele claro",
  skinToneMediumLight: "Tom de pele médio-claro",
  skinToneMedium: "Tom de pele médio",
  skinToneMediumDark: "Tom de pele médio-escuro",
  skinToneDark: "Tom de pele escuro",
};

export function IconPicker({
  onChange,
  onRemove,
  children,
}: {
  onChange: (icon: string) => void;
  onRemove?: () => void;
  children: ReactNode;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <Popover className="p-0" trigger={children}>
      {(close) => (
        <div>
          {onRemove && (
            <div className="flex justify-end border-b border-border px-2 py-1">
              <button
                onClick={() => {
                  onRemove();
                  close();
                }}
                className="rounded px-2 py-1 text-sm text-muted hover:bg-hover"
              >
                Remover
              </button>
            </div>
          )}
          <EmojiPicker
            theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
            emojiData={loadPortuguese}
            labels={LABELS}
            lazyLoadEmojis
            emojiStyle={EmojiStyle.APPLE}
            getEmojiUrl={(unified) => appleEmojiUrlByUnified(unified) ?? ""}
            previewConfig={{ showPreview: false }}
            height={380}
            onEmojiClick={(data) => {
              onChange(data.emoji);
              close();
            }}
          />
        </div>
      )}
    </Popover>
  );
}
