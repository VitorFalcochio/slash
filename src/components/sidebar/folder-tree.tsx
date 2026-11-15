"use client";

import {
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  FilePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { InlineRename } from "@/components/ui/inline-rename";
import { MenuItem, Popover } from "@/components/ui/popover";
import { DRAG_DOC, DRAG_FOLDER, dragHas } from "@/lib/dnd";
import { cn } from "@/lib/utils";
import { folderDescendants, sortByName, useDocuments, type Folder } from "@/store/documents";
import { useUi } from "@/store/ui";
import { DocItem } from "./doc-item";

export function FolderTree({ parentId, level = 0 }: { parentId: string | null; level?: number }) {
  const folders = useDocuments((s) => s.folders);
  const children = sortByName(Object.values(folders).filter((f) => f.parentId === parentId));
  return children.map((folder) => <FolderItem key={folder.id} folder={folder} level={level} />);
}

function FolderItem({ folder, level }: { folder: Folder; level: number }) {
  const router = useRouter();
  const docs = useDocuments((s) => s.docs);
  const folders = useDocuments((s) => s.folders);
  const { create, createFolder, renameFolder, deleteFolder, addDocToFolder, moveFolder } = useDocuments();
  const { renamingFolderId, setRenamingFolderId } = useUi();
  const [expanded, setExpanded] = useState(false);
  const [dropOver, setDropOver] = useState(false);
  const renaming = renamingFolderId === folder.id;

  // Páginas na lixeira somem da pasta, mas voltam se forem restauradas.
  const folderDocs = folder.docIds.map((id) => docs[id]).filter((d) => d && !d.isArchived);
  const hasSubfolders = Object.values(folders).some((f) => f.parentId === folder.id);
  const isEmpty = folderDocs.length === 0 && !hasSubfolders;

  const onNewSubfolder = () => {
    setRenamingFolderId(createFolder(folder.id));
    setExpanded(true);
  };

  const onNewPage = () => {
    const id = create(null);
    addDocToFolder(folder.id, id);
    setExpanded(true);
    router.push(`/documents?id=${id}`);
  };

  const onDelete = () => {
    const subfolders = folderDescendants(folders, folder.id).length;
    const extra = subfolders > 0 ? ` e ${subfolders} subpasta${subfolders > 1 ? "s" : ""}` : "";
    if (!confirm(`Excluir a pasta "${folder.name}"${extra}? As páginas não serão apagadas.`)) return;
    deleteFolder(folder.id);
    toast.success("Pasta excluída");
  };

  return (
    <>
      <div
        role="button"
        draggable={!renaming}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_FOLDER, folder.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (!dragHas(e, DRAG_DOC) && !dragHas(e, DRAG_FOLDER)) return;
          e.preventDefault();
          e.stopPropagation();
          setDropOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropOver(false);
          const docId = e.dataTransfer.getData(DRAG_DOC);
          const folderId = e.dataTransfer.getData(DRAG_FOLDER);
          if (docId) addDocToFolder(folder.id, docId);
          if (folderId && folderId !== folder.id) moveFolder(folderId, folder.id);
          setExpanded(true);
        }}
        onClick={() => !renaming && setExpanded((v) => !v)}
        style={{ paddingLeft: 8 + level * 12 }}
        className={cn(
          "group flex h-[30px] items-center gap-1 rounded-md pr-1 text-sm text-foreground/80 hover:bg-hover",
          dropOver && "bg-accent/15 ring-1 ring-accent ring-inset",
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center text-muted">
          <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
        </span>
        <span className="flex size-5 shrink-0 items-center justify-center text-muted">
          {expanded ? <FolderOpen className="size-4" /> : <FolderIcon className="size-4" />}
        </span>

        {renaming ? (
          <InlineRename
            initial={folder.name}
            onDone={(name) => {
              if (name) renameFolder(folder.id, name);
              setRenamingFolderId(null);
            }}
          />
        ) : (
          <span className="flex-1 truncate">{folder.name}</span>
        )}

        {!renaming && (
          <div className="flex items-center opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <Popover
              align="start"
              trigger={(
                <button className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover" aria-label="Opções da pasta">
                  <MoreHorizontal className="size-4" />
                </button>
              )}
            >
              {(close) => (
                <>
                  <MenuItem icon={<FilePlus />} onClick={() => { onNewPage(); close(); }}>
                    Nova página aqui
                  </MenuItem>
                  <MenuItem icon={<FolderPlus />} onClick={() => { onNewSubfolder(); close(); }}>
                    Nova subpasta
                  </MenuItem>
                  <MenuItem icon={<Pencil />} onClick={() => { setRenamingFolderId(folder.id); close(); }}>
                    Renomear
                  </MenuItem>
                  {folder.parentId && (
                    <MenuItem icon={<FolderIcon />} onClick={() => { moveFolder(folder.id, null); close(); }}>
                      Mover para a raiz
                    </MenuItem>
                  )}
                  <MenuItem icon={<Trash2 />} danger onClick={() => { close(); onDelete(); }}>
                    Excluir pasta
                  </MenuItem>
                </>
              )}
            </Popover>
            <button
              onClick={onNewPage}
              className="flex size-5 items-center justify-center rounded text-muted hover:bg-hover"
              aria-label="Nova página nesta pasta"
            >
              <Plus className="size-4" />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <>
          <FolderTree parentId={folder.id} level={level + 1} />
          {folderDocs.map((doc) => (
            <DocItem key={doc.id} doc={doc} level={level + 1} folderId={folder.id} />
          ))}
          {isEmpty && (
            <p className="py-1 text-sm text-muted" style={{ paddingLeft: 12 + (level + 1) * 12 + 22 }}>
              Pasta vazia
            </p>
          )}
        </>
      )}
    </>
  );
}
