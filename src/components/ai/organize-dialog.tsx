"use client";

import { Folder, FolderTree, Loader2, RefreshCw, Tag as TagIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DocIcon, docTitle } from "@/components/doc-icon";
import { EmojiText } from "@/components/emoji-text";
import { Modal } from "@/components/ui/modal";
import { aiBridge, aiModel, contentToMarkdown } from "@/lib/ai";
import { loadPageContent } from "@/lib/page-content";
import { randomTagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { useDocuments } from "@/store/documents";
import { useUi } from "@/store/ui";

type Suggestion = { id: string; tags: string[]; folder: string };

const SCHEMA = {
  type: "object",
  properties: {
    pages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "id exato da página" },
          tags: { type: "array", items: { type: "string" }, description: "1 a 3 etiquetas curtas" },
          folder: { type: "string", description: "nome da pasta, ou vazio se nenhuma fizer sentido" },
        },
        required: ["id", "tags", "folder"],
      },
    },
  },
  required: ["pages"],
};

const PREVIEW_CHARS = 1500;
const norm = (s: string) => s.trim().toLocaleLowerCase("pt-BR");

/** Sugestões de etiquetas e pastas feitas pela IA; nada muda até clicar em "Aplicar". */
export function OrganizeDialog() {
  const { organizeOpen, setOrganizeOpen } = useUi();
  return (
    <Modal open={organizeOpen} onClose={() => setOrganizeOpen(false)} className="flex max-h-[76vh] max-w-2xl flex-col">
      {organizeOpen && <Organizer onClose={() => setOrganizeOpen(false)} />}
    </Modal>
  );
}

/** Pede à IA as sugestões para todas as páginas (sem tocar no estado do componente). */
async function fetchSuggestions(): Promise<Suggestion[]> {
  const bridge = aiBridge();
  if (!bridge) throw new Error("O assistente só funciona no app para desktop.");
  const { docs, tags, folders } = useDocuments.getState();
  const pages = Object.values(docs).filter((d) => !d.isArchived);
  const previews = await Promise.all(
    pages.map(async (d) =>
      (await contentToMarkdown(await loadPageContent(d.id).catch(() => null))).slice(0, PREVIEW_CHARS),
    ),
  );
  const list = pages
    .map((d, i) => {
      const current = (d.tagIds ?? [])
        .map((t) => tags[t]?.name)
        .filter(Boolean)
        .join(", ");
      const parent = d.parentId ? docs[d.parentId]?.title : "";
      return `<pagina id="${d.id}" titulo="${d.title || "Sem título"}"${parent ? ` dentro_de="${parent}"` : ""}${current ? ` etiquetas_atuais="${current}"` : ""}>\n${previews[i] || "(vazia)"}\n</pagina>`;
    })
    .join("\n\n");

  const raw = await bridge.generate({
    model: aiModel(),
    schema: SCHEMA,
    system:
      "Você organiza as anotações de um estudante/profissional num app de notas. Para cada página, sugira de 1 a 3 etiquetas curtas (ex.: matéria, tipo de conteúdo) e uma pasta. " +
      "Reutilize etiquetas e pastas existentes sempre que fizerem sentido; crie novas só quando necessário, com nomes curtos em português e com inicial maiúscula. " +
      "Agrupe páginas do mesmo assunto na mesma pasta. Não repita etiquetas que a página já tem. Se a página estiver vazia ou não der para saber o assunto, devolva etiquetas vazias e pasta vazia. " +
      "Inclua todas as páginas, usando o id exato.",
    messages: [
      {
        role: "user",
        text:
          `Etiquetas existentes: ${
            Object.values(tags)
              .map((t) => t.name)
              .join(", ") || "nenhuma"
          }\n` +
          `Pastas existentes: ${
            Object.values(folders)
              .map((f) => f.name)
              .join(", ") || "nenhuma"
          }\n\n${list}`,
      },
    ],
  });
  const parsed = JSON.parse(raw) as { pages?: Suggestion[] };
  const current = useDocuments.getState().docs;
  const valid = (parsed.pages ?? [])
    .filter((s) => current[s.id])
    .map((s) => {
      const have = new Set((current[s.id].tagIds ?? []).map((t) => norm(tags[t]?.name ?? "")));
      const inFolder = Object.values(folders)
        .find((f) => norm(f.name) === norm(s.folder ?? ""))
        ?.docIds.includes(s.id);
      return {
        id: s.id,
        tags: [...new Set((s.tags ?? []).map((t) => t.trim()).filter((t) => t && !have.has(norm(t))))].slice(0, 3),
        folder: inFolder ? "" : (s.folder ?? "").trim(),
      };
    })
    .filter((s) => s.tags.length > 0 || s.folder);
  return valid;
}

function Organizer({ onClose }: { onClose: () => void }) {
  const docs = useDocuments((s) => s.docs);
  const tags = useDocuments((s) => s.tags);
  const folders = useDocuments((s) => s.folders);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchSuggestions()
      .then((valid) => {
        if (!alive) return;
        setSuggestions(valid);
        setSelected(new Set(valid.map((s) => s.id)));
        setState("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(
          e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") : String(e),
        );
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const tagExists = (name: string) => Object.values(tags).some((t) => norm(t.name) === norm(name));
  const folderExists = (name: string) => Object.values(folders).some((f) => norm(f.name) === norm(name));

  const apply = () => {
    const store = useDocuments.getState();
    const tagIds = new Map(Object.values(store.tags).map((t) => [norm(t.name), t.id]));
    const folderIds = new Map(Object.values(store.folders).map((f) => [norm(f.name), f.id]));
    let changes = 0;
    for (const s of suggestions.filter((s) => selected.has(s.id))) {
      for (const name of s.tags) {
        let tagId = tagIds.get(norm(name));
        if (!tagId) {
          tagId = store.createTag(name, randomTagColor());
          tagIds.set(norm(name), tagId);
        }
        store.addTagToDoc(s.id, tagId);
        changes++;
      }
      if (s.folder) {
        let folderId = folderIds.get(norm(s.folder));
        if (!folderId) {
          folderId = store.createFolder(null, s.folder);
          folderIds.set(norm(s.folder), folderId);
        }
        store.addDocToFolder(folderId, s.id);
        changes++;
      }
    }
    toast.success(
      `${selected.size} página${selected.size === 1 ? "" : "s"} organizada${selected.size === 1 ? "" : "s"}`,
    );
    if (changes) onClose();
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10">
          <FolderTree className="size-5 text-accent" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Organizar matérias</h2>
          <p className="text-xs text-muted">A IA sugere etiquetas e pastas. Nada muda até você aplicar.</p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-muted hover:bg-hover" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-40 flex-1 overflow-y-auto">
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted">
            <Loader2 className="size-5 animate-spin" />
            Lendo {Object.values(docs).filter((d) => !d.isArchived).length} páginas...
          </div>
        )}
        {state === "error" && (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => {
                setState("loading");
                setAttempt((n) => n + 1);
              }}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 hover:bg-hover"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        )}
        {state === "ready" && suggestions.length === 0 && (
          <p className="px-6 py-12 text-center text-sm text-muted">Tudo certo: a IA não encontrou nada para mudar.</p>
        )}
        {state === "ready" &&
          suggestions.map((s) => {
            const doc = docs[s.id];
            if (!doc) return null;
            return (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 border-b border-border px-5 py-3 hover:bg-hover",
                  !selected.has(s.id) && "opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <DocIcon icon={doc.icon} size={16} />
                    <span className="truncate">
                      <EmojiText text={docTitle(doc.title)} />
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.tags.map((t) => (
                      <Chip key={t} icon={<TagIcon />} isNew={!tagExists(t)}>
                        {t}
                      </Chip>
                    ))}
                    {s.folder && (
                      <Chip icon={<Folder />} isNew={!folderExists(s.folder)}>
                        {s.folder}
                      </Chip>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-sidebar px-5 py-3">
        <span className="flex-1 text-xs text-muted">
          {state === "ready" && suggestions.length > 0 && "Itens com contorno tracejado serão criados."}
        </span>
        <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm hover:bg-hover">
          Cancelar
        </button>
        <button
          onClick={apply}
          disabled={state !== "ready" || selected.size === 0}
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          Aplicar {selected.size > 0 && state === "ready" ? `(${selected.size})` : ""}
        </button>
      </div>
    </>
  );
}

function Chip({ icon, isNew, children }: { icon: React.ReactNode; isNew: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs [&>svg]:size-3",
        isNew ? "border-dashed border-accent/60 text-accent" : "border-border bg-hover",
      )}
      title={isNew ? "Será criada" : "Já existe"}
    >
      {icon}
      {children}
    </span>
  );
}
