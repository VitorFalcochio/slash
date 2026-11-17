"use client";

import { CalendarDays, ChevronsLeft, Sparkles, FolderPlus, Plus, PlusCircle, Search, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { agendaUrl } from "@/components/agenda/agenda-view";
import { Popover } from "@/components/ui/popover";
import { DRAG_FOLDER, dragHas } from "@/lib/dnd";
import { randomTagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { sortDocs, useDocuments } from "@/store/documents";
import { useUi } from "@/store/ui";
import { DocItem, DocTree } from "./doc-item";
import { FolderTree } from "./folder-tree";
import { TagList } from "./tag-list";
import { TrashBox } from "./trash-box";

const MIN_WIDTH = 220;
const MAX_WIDTH = 480;

export function Sidebar() {
  const router = useRouter();
  const { create, createFolder, createTag, moveFolder } = useDocuments();
  const docs = useDocuments((s) => s.docs);
  const { sidebarCollapsed, setSidebarCollapsed, setSearchOpen, setSettingsOpen, setRenamingFolderId, setAssistantOpen } = useUi();
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null);
  const [width, setWidth] = useState(260);
  const [resizing, setResizing] = useState(false);
  const resizingRef = useRef(false);

  const favorites = sortDocs(Object.values(docs).filter((d) => d.isFavorite && !d.isArchived));

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!resizingRef.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    };
    const onUp = () => {
      resizingRef.current = false;
      setResizing(false);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);

  const onCreate = () => router.push(`/documents?id=${create()}`);
  const onCreateFolder = () => setRenamingFolderId(createFolder(null));
  const onCreateTag = () => setRenamingTagId(createTag("Nova etiqueta", randomTagColor()));

  return (
    <aside
      style={{ width: sidebarCollapsed ? 0 : width }}
      className={cn(
        "group/sidebar relative flex h-full shrink-0 flex-col overflow-hidden bg-sidebar",
        !resizing && "transition-[width] duration-200",
        resizing && "select-none",
      )}
    >
      <div style={{ width }} className="flex h-full flex-col">
      <div className="titlebar-drag flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="flex-1 truncate text-sm font-semibold">Slash</span>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="rounded p-0.5 text-muted opacity-0 transition hover:bg-hover group-hover/sidebar:opacity-100"
          aria-label="Recolher barra lateral"
        >
          <ChevronsLeft className="size-5" />
        </button>
      </div>

      <div className="px-1.5 py-1">
        <NavButton icon={<Search />} onClick={() => setSearchOpen(true)} hint="Ctrl K">
          Buscar
        </NavButton>
        <NavButton icon={<CalendarDays />} onClick={() => router.push(agendaUrl())}>
          Agenda
        </NavButton>
        <NavButton icon={<Sparkles />} onClick={() => setAssistantOpen(!useUi.getState().assistantOpen)} hint="Ctrl J">
          Assistente
        </NavButton>
        <NavButton icon={<Settings />} onClick={() => setSettingsOpen(true)}>
          Configurações
        </NavButton>
        <NavButton icon={<PlusCircle />} onClick={onCreate}>
          Nova página
        </NavButton>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {favorites.length > 0 && (
          <Section title="Favoritos">
            {favorites.map((doc) => (
              <DocItem key={doc.id} doc={doc} level={0} flat />
            ))}
          </Section>
        )}
        <Section
          title="Organizar"
          onAdd={onCreateFolder}
          addLabel="Nova pasta"
          // Soltar uma pasta no título "Organizar" leva ela de volta para a raiz.
          onDrop={(e) => {
            const folderId = e.dataTransfer.getData(DRAG_FOLDER);
            if (folderId) moveFolder(folderId, null);
          }}
          accepts={(e) => dragHas(e, DRAG_FOLDER)}
        >
          <FolderTree parentId={null} />
          <NavButton icon={<FolderPlus />} onClick={onCreateFolder}>
            Nova pasta
          </NavButton>
        </Section>

        <Section title="Etiquetas" onAdd={onCreateTag} addLabel="Nova etiqueta">
          <TagList renamingId={renamingTagId} setRenamingId={setRenamingTagId} />
        </Section>

        <Section title="Privado" onAdd={onCreate}>
          <DocTree parentId={null} />
          <NavButton icon={<Plus />} onClick={onCreate}>
            Adicionar página
          </NavButton>
        </Section>

        <div className="mt-3">
          <Popover
            block
            side="right"
            trigger={(
              <NavButton icon={<Trash2 />}>
                Lixeira
              </NavButton>
            )}
          >
            {(close) => <TrashBox onNavigate={close} />}
          </Popover>
        </div>
      </div>
      </div>

      <div
        onPointerDown={(e) => {
          e.preventDefault();
          resizingRef.current = true;
          setResizing(true);
        }}
        onDoubleClick={() => setWidth(260)}
        className="absolute top-0 right-0 h-full w-1 cursor-ew-resize bg-border opacity-0 transition hover:opacity-100"
      />
      <div className="pointer-events-none absolute top-0 right-0 h-full w-px bg-border" />
    </aside>
  );
}

function Section({
  title,
  onAdd,
  addLabel = "Nova página",
  onDrop,
  accepts,
  children,
}: {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  onDrop?: (e: DragEvent) => void;
  accepts?: (e: DragEvent) => boolean;
  children: ReactNode;
}) {
  const [dropOver, setDropOver] = useState(false);
  return (
    <div className="group/section mt-3">
      <div
        onDragOver={(e) => {
          if (!accepts?.(e)) return;
          e.preventDefault();
          setDropOver(true);
        }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropOver(false);
          onDrop?.(e);
        }}
        className={cn(
          "flex items-center rounded-md px-2 pb-0.5 text-xs font-medium text-muted",
          dropOver && "bg-accent/15 ring-1 ring-accent ring-inset",
        )}
      >
        <span className="flex-1">{title}</span>
        {onAdd && (
          <button
            onClick={onAdd}
            className="rounded p-0.5 opacity-0 hover:bg-hover group-hover/section:opacity-100"
            aria-label={addLabel}
            title={addLabel}
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function NavButton({
  icon,
  children,
  onClick,
  hint,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-sm text-foreground/70 hover:bg-hover"
    >
      <span className="flex size-5 items-center justify-center text-muted [&>svg]:size-4">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {hint && <kbd className="text-[11px] text-muted">{hint}</kbd>}
    </button>
  );
}
