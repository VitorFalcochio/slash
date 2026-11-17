"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { docToBlocks, filterSuggestionItems, type PartialBlock } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { pt } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import {
  getDefaultReactEmojiPickerItems,
  getDefaultReactSlashMenuItems,
  GridSuggestionMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { AppleEmoji } from "@/components/apple-emoji";
import { registerEditor } from "@/lib/editor-registry";
import { saveUpload } from "@/lib/storage";
import { AppleEmojiExtension } from "./apple-emoji-extension";

// O menu de comandos abre com Ctrl+Espaço, não ao digitar "/".
// O trigger "/" continua sendo a chave interna do menu (o botão "+" ao lado dos blocos usa ela).
const COMMAND_MENU = "/";
const COMMAND_HINT = "Pressione Ctrl+Espaço para ver os comandos";

type EditorProps = {
  initialContent?: string;
  /** Recebe uma função que gera o JSON do documento; quem chama decide quando rodar (ex.: só na hora de salvar). */
  onChange?: (serialize: () => string) => void;
  editable?: boolean;
  /** Página deste editor: com ela, o assistente consegue inserir texto aqui (ver lib/editor-registry.ts). */
  docId?: string;
};

export default function Editor({ initialContent, onChange, editable = true, docId }: EditorProps) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    dictionary: {
      ...pt,
      placeholders: {
        ...pt.placeholders,
        emptyDocument: COMMAND_HINT,
        default: COMMAND_HINT,
      },
    },
    initialContent: initialContent ? (JSON.parse(initialContent) as PartialBlock[]) : undefined,
    uploadFile: saveUpload,
    extensions: [AppleEmojiExtension],
  });

  useEffect(() => (docId && editable ? registerEditor(docId, editor) : undefined), [docId, editable, editor]);

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      slashMenu={false}
      emojiPicker={false}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      onChange={() => {
        // O documento do ProseMirror é imutável: guardar a referência é instantâneo
        // e continua válido mesmo depois que o editor fecha.
        const doc = editor.prosemirrorState.doc;
        onChange?.(() => JSON.stringify(docToBlocks(doc)));
      }}
      onKeyDownCapture={(e) => {
        if (editable && e.ctrlKey && e.code === "Space") {
          e.preventDefault();
          editor.getExtension(SuggestionMenu)?.openSuggestionMenu(COMMAND_MENU);
        }
      }}
    >
      <SuggestionMenuController
        triggerCharacter={COMMAND_MENU}
        // Digitar "/" escreve uma barra normal; o menu só abre pelo atalho.
        shouldOpen={() => false}
        getItems={async (query) => filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query)}
      />
      {/* Seletor de emoji ao digitar ":" + 2 letras, com as imagens da Apple. */}
      <GridSuggestionMenuController
        triggerCharacter=":"
        columns={10}
        minQueryLength={2}
        getItems={async (query) =>
          (await getDefaultReactEmojiPickerItems(editor, query)).map((item) => ({
            ...item,
            icon: <AppleEmoji emoji={item.id} size={24} />,
          }))
        }
      />
    </BlockNoteView>
  );
}
