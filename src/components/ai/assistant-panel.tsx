"use client";

import {
  ArrowUp,
  Check,
  Copy,
  FilePlus2,
  FolderTree,
  KeyRound,
  Loader2,
  SquarePen,
  Sparkles,
  Square,
  TextQuote,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { aiBridge } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { useAssistant, type ChatMessage } from "@/store/assistant";
import { useDocuments } from "@/store/documents";
import { useUi } from "@/store/ui";
import { createPageFromAnswer, insertSummary, summarizePage } from "./actions";
import { Markdown } from "./markdown";

/** Painel do assistente de IA, à direita da página. Ctrl+J abre e fecha. */
export function AssistantPanel() {
  const { assistantOpen, setAssistantOpen } = useUi();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "j" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setAssistantOpen(!useUi.getState().assistantOpen);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setAssistantOpen]);

  if (!assistantOpen) return null;
  return <Panel onClose={() => setAssistantOpen(false)} />;
}

function Panel({ onClose }: { onClose: () => void }) {
  const currentId = useSearchParams().get("id");
  const currentDoc = useDocuments((s) => (currentId ? s.docs[currentId] : undefined));
  const { messages, streamId, context, ask, stop, reset } = useAssistant();
  const { setOrganizeOpen, setSettingsOpen } = useUi();
  const settingsOpen = useUi((s) => s.settingsOpen);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bridge = aiBridge();

  // Confere a chave ao abrir e de novo quando as configurações fecham (pode ter acabado de ser salva).
  useEffect(() => {
    if (!bridge || settingsOpen) return;
    bridge.status().then((s) => setHasKey(s.hasKey));
  }, [bridge, settingsOpen]);

  useEffect(() => inputRef.current?.focus(), []);

  // Acompanha a resposta enquanto ela chega.
  const lastText = messages.at(-1)?.text;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, lastText]);

  const send = (text = input) => {
    const prompt = text.trim();
    if (!prompt || streamId) return;
    setInput("");
    void ask(prompt, { currentId });
  };

  const ready = Boolean(bridge && hasKey);

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border bg-background">
      <div className="titlebar flex h-11 shrink-0 items-center gap-1 border-b border-border px-3">
        <Sparkles className="size-4 text-accent" />
        <span className="flex-1 text-sm font-semibold">Assistente</span>
        <IconButton label="Organizar matérias" onClick={() => setOrganizeOpen(true)} disabled={!ready}>
          <FolderTree />
        </IconButton>
        <IconButton label="Nova conversa" onClick={reset} disabled={messages.length === 0}>
          <SquarePen />
        </IconButton>
        <IconButton label="Fechar (Ctrl+J)" onClick={onClose}>
          <X />
        </IconButton>
      </div>

      {!bridge ? (
        <Notice title="Disponível no app para desktop">O assistente usa a sua chave do Gemini, guardada no app instalado.</Notice>
      ) : hasKey === false ? (
        <Notice title="Conecte o Gemini">
          <p>Para o assistente ler suas notas e responder, cole sua chave de API do Google Gemini nas Configurações.</p>
          <button
            onClick={() => setSettingsOpen(true, "ai")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
          >
            <KeyRound className="size-4" /> Configurar chave
          </button>
        </Notice>
      ) : (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <Suggestions
                docTitle={currentDoc && !currentDoc.isArchived ? currentDoc.title.trim() || "Sem título" : null}
                onSummarize={() => currentDoc && summarizePage(currentDoc)}
                onOrganize={() => setOrganizeOpen(true)}
                onAsk={send}
                onFill={(text) => {
                  setInput(text);
                  inputRef.current?.focus();
                }}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((m) => (
                  <Message key={m.id} message={m} />
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border p-2">
            <div className="flex items-end gap-2 rounded-lg border border-border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent/30">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={Math.min(6, Math.max(1, input.split("\n").length))}
                placeholder="Pergunte sobre suas notas..."
                className="max-h-36 min-h-6 flex-1 resize-none bg-transparent py-0.5 text-sm outline-none placeholder:text-muted"
              />
              {streamId ? (
                <button
                  onClick={stop}
                  aria-label="Parar"
                  title="Parar"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background"
                >
                  <Square className="size-3" fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => send()}
                  disabled={!input.trim()}
                  aria-label="Enviar"
                  title="Enviar (Enter)"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background disabled:opacity-30"
                >
                  <ArrowUp className="size-4" />
                </button>
              )}
            </div>
            <p className="mt-1 px-1 text-[11px] text-muted">
              {context
                ? `Lendo ${context.included}${context.included < context.total ? ` de ${context.total}` : ""} página${context.total === 1 ? "" : "s"} · Gemini`
                : "Responde com base nas suas páginas · Gemini"}
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

function Suggestions({
  docTitle,
  onSummarize,
  onOrganize,
  onAsk,
  onFill,
}: {
  docTitle: string | null;
  onSummarize: () => void;
  onOrganize: () => void;
  onAsk: (text: string) => void;
  onFill: (text: string) => void;
}) {
  const questions = ["O que eu anotei nos últimos dias?", "Liste as tarefas e pendências que aparecem nas minhas notas"];
  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="px-1 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-accent/10">
          <Sparkles className="size-5 text-accent" />
        </div>
        <p className="mt-2 text-sm font-medium">Pergunte qualquer coisa sobre suas notas</p>
        <p className="mt-0.5 text-xs text-muted">As respostas mostram de quais páginas veio cada informação.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {docTitle && (
          <Suggestion icon={<TextQuote />} onClick={onSummarize}>
            Resumir &quot;{docTitle}&quot;
          </Suggestion>
        )}
        <Suggestion icon={<FolderTree />} onClick={onOrganize}>
          Organizar matérias com etiquetas e pastas
        </Suggestion>
        <Suggestion icon={<FilePlus2 />} onClick={() => onFill("Junte tudo o que eu tenho anotado sobre ")}>
          Juntar tudo o que tenho sobre um assunto...
        </Suggestion>
        {questions.map((q) => (
          <Suggestion key={q} onClick={() => onAsk(q)}>
            {q}
          </Suggestion>
        ))}
      </div>
    </div>
  );
}

function Suggestion({ icon, children, onClick }: { icon?: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-hover"
    >
      {icon && <span className="flex text-muted [&>svg]:size-4">{icon}</span>}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const target = useDocuments((s) => (message.insertInto ? s.docs[message.insertInto] : undefined));

  if (message.role === "user") {
    return (
      <div className="ml-8 self-end rounded-2xl rounded-br-md bg-hover px-3 py-2 text-sm whitespace-pre-wrap">
        {message.display ?? message.text}
      </div>
    );
  }

  if (message.status === "error") {
    return <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{message.text}</div>;
  }

  if (message.status === "streaming" && !message.text) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" /> Lendo suas notas...
      </div>
    );
  }

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group/msg">
      <Markdown text={message.text} />
      {message.status === "done" && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {target && !target.isArchived && (
            <ActionButton icon={<TextQuote />} disabled={busy} onClick={() => run(() => insertSummary(target.id, message.text))}>
              Inserir no topo da página
            </ActionButton>
          )}
          <ActionButton
            icon={<FilePlus2 />}
            disabled={busy}
            onClick={() => run(async () => router.push(`/documents?id=${await createPageFromAnswer(message.text)}`))}
          >
            Criar página com isto
          </ActionButton>
          <ActionButton
            icon={copied ? <Check /> : <Copy />}
            onClick={() => {
              void navigator.clipboard.writeText(message.text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? "Copiado" : "Copiar"}
          </ActionButton>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted hover:bg-hover hover:text-foreground disabled:opacity-50 [&>svg]:size-3.5"
    >
      {icon}
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("rounded p-1 text-muted hover:bg-hover hover:text-foreground disabled:opacity-40 [&>svg]:size-4")}
    >
      {children}
    </button>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10">
        <Sparkles className="size-5 text-accent" />
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <div className="mt-1 text-sm text-muted">{children}</div>
    </div>
  );
}
