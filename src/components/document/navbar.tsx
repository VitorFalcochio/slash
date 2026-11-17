"use client";

import { Check, Copy, Globe, Lock, LockOpen, Menu, MoreHorizontal, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { DocIcon, docTitle } from "@/components/doc-icon";
import { EmojiText } from "@/components/emoji-text";
import { toggleProtection } from "@/components/lock/use-protection";
import { MenuItem, Popover } from "@/components/ui/popover";
import { useLock } from "@/lib/lock";
import { cn } from "@/lib/utils";
import { useDocuments, type Doc } from "@/store/documents";
import { useUi } from "@/store/ui";

function useAncestors(doc: Doc) {
  const docs = useDocuments((s) => s.docs);
  const chain: Doc[] = [];
  let current: Doc | undefined = doc;
  while (current) {
    chain.unshift(current);
    current = current.parentId ? docs[current.parentId] : undefined;
  }
  return chain;
}

export function Navbar({ doc }: { doc: Doc }) {
  const router = useRouter();
  const { update, archive } = useDocuments();
  const { sidebarCollapsed, setSidebarCollapsed } = useUi();
  const chain = useAncestors(doc);
  const unlocked = useLock((s) => s.unlocked);

  return (
    <nav className="titlebar sticky top-0 z-40 flex h-11 items-center gap-1 bg-background px-3 text-sm">
      {sidebarCollapsed && (
        <button onClick={() => setSidebarCollapsed(false)} className="rounded p-1 text-muted hover:bg-hover" aria-label="Abrir barra lateral">
          <Menu className="size-5" />
        </button>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-0.5">
        {chain.map((item, i) => (
          <Fragment key={item.id}>
            {i > 0 && <span className="text-muted">/</span>}
            <Link
              href={`/documents?id=${item.id}`}
              className="flex min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-hover"
            >
              <DocIcon icon={item.icon} size={16} />
              <span className="max-w-40 truncate"><EmojiText text={docTitle(item.title)} /></span>
            </Link>
          </Fragment>
        ))}
      </div>

      <span className="hidden px-2 text-xs text-muted sm:block">
        Editado {new Date(doc.updatedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
      </span>

      {doc.isLocked && unlocked && (
        <button
          onClick={() => useLock.getState().lock()}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-muted hover:bg-hover hover:text-foreground"
          title="Bloquear todas as páginas protegidas agora"
        >
          <LockOpen className="size-3.5" /> Bloquear
        </button>
      )}

      {!doc.isArchived && <PublishButton doc={doc} />}

      <button
        onClick={() => update(doc.id, { isFavorite: !doc.isFavorite })}
        className="rounded p-1.5 hover:bg-hover"
        aria-label="Favoritar"
      >
        <Star className={cn("size-4", doc.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted")} />
      </button>

      <Popover
        align="end"
        trigger={(
          <button className="rounded p-1.5 text-muted hover:bg-hover" aria-label="Mais opções">
            <MoreHorizontal className="size-4" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItem
              icon={<Copy />}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copiado");
                close();
              }}
            >
              Copiar link
            </MenuItem>
            <MenuItem
              icon={doc.isLocked ? <LockOpen /> : <Lock />}
              onClick={() => {
                toggleProtection(doc);
                close();
              }}
            >
              {doc.isLocked ? "Remover senha" : "Proteger com senha"}
            </MenuItem>
            {!doc.isArchived && (
              <MenuItem
                icon={<Trash2 />}
                danger
                onClick={() => {
                  archive(doc.id);
                  toast.success("Página movida para a lixeira");
                  router.push("/documents");
                }}
              >
                Mover para a lixeira
              </MenuItem>
            )}
          </>
        )}
      </Popover>
    </nav>
  );
}

function PublishButton({ doc }: { doc: Doc }) {
  const update = useDocuments((s) => s.update);
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/preview?id=${doc.id}`;

  return (
    <Popover
      align="end"
      className="w-80 p-3"
      trigger={(
        <button className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-hover">
          Publicar
          {doc.isPublished && <Globe className="size-3.5 text-accent" />}
        </button>
      )}
    >
      {() =>
        doc.isPublished ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-accent">
              <Globe className="size-4 animate-pulse" /> Esta página está publicada
            </div>
            <div className="flex">
              <input value={url} readOnly className="h-8 flex-1 truncate rounded-l-md border border-border bg-hover px-2 text-xs" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1000);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-r-md border border-l-0 border-border hover:bg-hover"
                aria-label="Copiar link"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
            <button
              onClick={() => update(doc.id, { isPublished: false })}
              className="w-full rounded-md border border-border py-1.5 hover:bg-hover"
            >
              Despublicar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center text-sm">
            <Globe className="size-8 text-muted" />
            <p className="font-medium">Publicar esta página</p>
            <p className="text-xs text-muted">Compartilhe uma versão somente leitura.</p>
            <button
              onClick={() => {
                update(doc.id, { isPublished: true });
                toast.success("Página publicada");
              }}
              className="mt-1 w-full rounded-md bg-accent py-1.5 font-medium text-white hover:opacity-90"
            >
              Publicar
            </button>
          </div>
        )
      }
    </Popover>
  );
}

export function ArchivedBanner({ doc }: { doc: Doc }) {
  const router = useRouter();
  const { restore, remove } = useDocuments();

  return (
    <div className="flex items-center justify-center gap-3 bg-red-500 px-4 py-2 text-sm text-white">
      <span>Esta página está na lixeira.</span>
      <button onClick={() => restore(doc.id)} className="rounded border border-white/70 px-2 py-0.5 hover:bg-white/15">
        Restaurar página
      </button>
      <button
        onClick={() => {
          if (!confirm("Excluir esta página permanentemente?")) return;
          remove(doc.id);
          router.push("/documents");
        }}
        className="rounded border border-white/70 px-2 py-0.5 hover:bg-white/15"
      >
        Excluir permanentemente
      </button>
    </div>
  );
}
