import { createExtension } from "@blocknote/core";
import type { Node as PMNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { appleEmojiUrl, EMOJI_REGEX } from "@/lib/emoji";

const key = new PluginKey<DecorationSet>("appleEmoji");

function buildDecorations(doc: PMNode) {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText || parent?.type.spec.code) return;
    for (const match of node.text!.matchAll(EMOJI_REGEX)) {
      const url = appleEmojiUrl(match[0]);
      if (!url) continue;
      const from = pos + match.index!;
      decorations.push(
        Decoration.inline(from, from + match[0].length, {
          class: "apple-emoji",
          style: `background-image: url("${url}")`,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

/**
 * Mostra os emojis do texto com as imagens da Apple. O documento continua guardando
 * o caractere do emoji; só a renderização muda (ver `.apple-emoji` em globals.css).
 */
export const AppleEmojiExtension = createExtension({
  key: "appleEmoji",
  prosemirrorPlugins: [
    new Plugin({
      key,
      state: {
        init: (_, state) => buildDecorations(state.doc),
        apply: (tr, old) => (tr.docChanged ? buildDecorations(tr.doc) : old),
      },
      props: {
        decorations: (state) => key.getState(state),
      },
    }),
  ],
});
