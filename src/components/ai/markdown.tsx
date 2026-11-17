"use client";

import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { DocIcon, docTitle } from "@/components/doc-icon";
import { EmojiText } from "@/components/emoji-text";
import { useDocuments } from "@/store/documents";

// Markdown simples das respostas da IA: títulos, listas, citações, código, **negrito**, *itálico*,
// `código`, links e as citações de página [[id]] (viram um link para a página).

const INLINE =
  /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]\]|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*[^*\s][^*\n]*\*)/gi;

function Citation({ id }: { id: string }) {
  const router = useRouter();
  const doc = useDocuments((s) => s.docs[id]);
  if (!doc) return null;
  return (
    <button
      onClick={() => router.push(`/documents?id=${id}`)}
      title={`Abrir "${docTitle(doc.title)}"`}
      className="mx-0.5 inline-flex max-w-44 translate-y-[1px] items-center gap-1 rounded bg-accent/10 px-1.5 align-baseline text-xs leading-5 text-accent hover:bg-accent/20"
    >
      <DocIcon icon={doc.icon} size={12} />
      <span className="truncate">
        <EmojiText text={docTitle(doc.title)} />
      </span>
    </button>
  );
}

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("[[")) return <Citation key={i} id={part.slice(2, -2).toLowerCase()} />;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return (
        <code key={i} className="rounded bg-hover px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link)
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
          {link[1]}
        </a>
      );
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={blocks.length}>{inline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={list.ordered ? "list-decimal pl-5" : "list-disc pl-5"}>
        {list.items.map((item, i) => (
          <li key={i} className="pl-0.5">
            {inline(item)}
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };
  const flush = () => {
    flushParagraph();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) code.push(lines[i]);
      blocks.push(
        <pre key={blocks.length} className="overflow-x-auto rounded-md bg-hover p-2 text-xs">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const size = heading[1].length <= 2 ? "text-[15px]" : "text-sm";
      blocks.push(
        <p key={blocks.length} className={`${size} mt-1 font-semibold`}>
          {inline(heading[2])}
        </p>,
      );
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push(
        <blockquote key={blocks.length} className="border-l-2 border-border pl-3 text-muted">
          {inline(quote[1])}
        </blockquote>,
      );
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flush();

  return <div className="flex flex-col gap-2 text-sm leading-relaxed">{blocks}</div>;
}
