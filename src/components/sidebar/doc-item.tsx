"use client";

import {
  ChevronLeft,
  ChevronRight,
  Folder as FolderIcon,
  FolderMinus,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Star,
  StarOff,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DocIcon, docTitle } from "@/components/doc-icon";
import { EmojiText } from "@/components/emoji-text";
import { TagPicker } from "@/components/tags/tag-picker";
import { MenuItem, Popover } from "@/components/ui/popover";
import { DRAG_DOC } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { sortByName, sortDocs, useDocuments, type Doc, type Folder } from "@/store/documents";
import { useUi } from "@/store/ui";

export function DocTree({ parentId, level = 0 }: { parentId: string | null; level?: number }) {
  const docs = useDocuments((s) => s.docs);
  const children = sortDocs(Object.values(docs).filter((d) => d.parentId === parentId && !d.isArchived));

  if (level > 0 && children.length === 0) {
    return (
      <p className="py-1 text-sm text-muted" style={{ paddingLeft: 12 + level * 12 + 22 }}>
        Sem páginas dentro
      </p>
    );
  }

  return children.map((doc) => <DocItem key={doc.id} doc={doc} level={level} />);
}

export function DocItem({
  doc,
  level,
  flat,
  folderId,
}: {
  doc: Doc;
  level: number;
  flat?: boolean;
  /** Pasta onde este atalho está (habilita "Remover da pasta"). */
  folderId?: string;
}) {
  const router = useRouter();
  const activeId = useSearchParams().get("id");
  const { create, archive } = useDocuments();
  const [expanded, setExpanded] = useState(false);
  const active = activeId === doc.id;

  const onCreateChild = () => {
    const id = create(doc.id);
    setExpanded(true);
    router.push(`/documents?id=${id}`);
  };

  return (
    <>
      <div
        role="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_DOC, doc.id);
          e.dataTransfer.effectAllowed = "copyLink";
        }}
        onClick={() => router.push(`/documents?id=${doc.id}`)}
        style={{ paddingLeft: 8 + level * 12 }}
        className={cn(
          "group flex h-[30px] items-center gap-1 rounded-md pr-1 text-sm text-foreground/80 hover:bg-hover",
          active && "bg-hover font-medium text-foreground",
        )}
      >
        {!flat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
          </button>
        )}
        <span className="flex size-5 shrink-0 items-center justify-center text-[15px]">
          <DocIcon icon={doc.icon} />
        </span>
        <span className="flex-1 truncate"><EmojiText text={docTitle(doc.title)} /></span>

        <div className="flex items-center opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <Popover
            align="start"
            trigger={(
              <button className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover">
                <MoreHorizontal className="size-4" />
              </button>
            )}
          >
            {(close) => (
              <DocMenu
                doc={doc}
                folderId={folderId}
                close={close}
                onArchive={() => {
                  archive(doc.id);
                  toast.success("Página movida para a lixeira");
                  if (active) router.push("/documents");
                }}
              />
            )}
          </Popover>
          {!flat && (
            <button
              onClick={onCreateChild}
              className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover"
              aria-label="Adicionar página dentro"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>
      {!flat && expanded && <DocTree parentId={doc.id} level={level + 1} />}
    </>
  );
}

/** Menu "…" da página. As listas de pastas e etiquetas abrem dentro do próprio menu. */
function DocMenu({
  doc,
  folderId,
  close,
  onArchive,
}: {
  doc: Doc;
  folderId?: string;
  close: () => void;
  onArchive: () => void;
}) {
  const { update, removeDocFromFolder } = useDocuments();
  const [view, setView] = useState<"main" | "folders" | "tags">("main");

  if (view === "tags") {
    return (
      <>
        <BackButton onClick={() => setView("main")}>Etiquetas</BackButton>
        <TagPicker docId={doc.id} />
      </>
    );
  }

  if (view === "folders") {
    return (
      <>
        <BackButton onClick={() => setView("main")}>Adicionar à pasta</BackButton>
        <FolderChooser docId={doc.id} close={close} />
      </>
    );
  }

  return (
    <>
      <MenuItem
        icon={doc.isFavorite ? <StarOff /> : <Star />}
        onClick={() => {
          update(doc.id, { isFavorite: !doc.isFavorite });
          close();
        }}
      >
        {doc.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      </MenuItem>
      <MenuItem icon={<FolderPlus />} onClick={() => setView("folders")}>
        <span className="flex-1">Adicionar à pasta</span>
        <ChevronRight className="size-4 text-muted" />
      </MenuItem>
      <MenuItem icon={<TagIcon />} onClick={() => setView("tags")}>
        <span className="flex-1">Etiquetas</span>
        <ChevronRight className="size-4 text-muted" />
      </MenuItem>
      {folderId && (
        <MenuItem
          icon={<FolderMinus />}
          onClick={() => {
            removeDocFromFolder(folderId, doc.id);
            close();
          }}
        >
          Remover da pasta
        </MenuItem>
      )}
      <MenuItem icon={<Trash2 />} danger onClick={onArchive}>
        Mover para a lixeira
      </MenuItem>
      <div className="mt-1 border-t border-border px-2 pt-1.5 pb-0.5 text-xs text-muted">
        Editado em {new Date(doc.updatedAt).toLocaleString("pt-BR")}
      </div>
    </>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mb-1 flex w-full items-center gap-1 rounded-md px-1 py-1 text-left text-xs font-medium text-muted hover:bg-hover"
    >
      <ChevronLeft className="size-4" /> {children}
    </button>
  );
}

/** Lista todas as pastas (com recuo das subpastas) para escolher onde colocar a página. */
function FolderChooser({ docId, close }: { docId: string; close: () => void }) {
  const folders = useDocuments((s) => s.folders);
  const { addDocToFolder, createFolder } = useDocuments();
  const setRenamingFolderId = useUi((s) => s.setRenamingFolderId);

  const rows: { folder: Folder; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const folder of sortByName(Object.values(folders).filter((f) => f.parentId === parentId))) {
      rows.push({ folder, depth });
      walk(folder.id, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <div className="w-60">
      <div className="max-h-64 overflow-y-auto">
        {rows.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted">Você ainda não tem pastas</p>}
        {rows.map(({ folder, depth }) => {
          const inside = folder.docIds.includes(docId);
          return (
            <button
              key={folder.id}
              disabled={inside}
              onClick={() => {
                addDocToFolder(folder.id, docId);
                toast.success(`Adicionada em "${folder.name}"`);
                close();
              }}
              style={{ paddingLeft: 8 + depth * 14 }}
              className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm hover:bg-hover disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <FolderIcon className="size-4 shrink-0 text-muted" />
              <span className="flex-1 truncate">{folder.name}</span>
              {inside && <span className="text-xs text-muted">já está</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-1 border-t border-border pt-1">
        <MenuItem
          icon={<Plus />}
          onClick={() => {
            const id = createFolder(null);
            addDocToFolder(id, docId);
            setRenamingFolderId(id);
            close();
          }}
        >
          Nova pasta com esta página
        </MenuItem>
      </div>
    </div>
  );
}
