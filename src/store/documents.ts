"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { deletePageContent } from "@/lib/page-content";
import { appStorage, backend } from "@/lib/storage";

export type Doc = {
  id: string;
  title: string;
  parentId: string | null;
  icon?: string;
  coverImage?: string;
  /**
   * Só existe em dados antigos: o conteúdo agora fica num arquivo por página (ver lib/page-content.ts)
   * e é migrado para lá na primeira abertura.
   */
  content?: string;
  /** Etiquetas aplicadas na página. */
  tagIds?: string[];
  /** Pede a senha mestra antes de mostrar o conteúdo (ver lib/lock.ts). */
  isLocked?: boolean;
  isArchived: boolean;
  isPublished: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
};

/**
 * Pasta da seção "Organizar". Guarda atalhos para páginas (como no AFFiNE):
 * a página continua no lugar dela na árvore e pode estar em várias pastas.
 */
export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  docIds: string[];
  createdAt: number;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

type DocPatch = Partial<Omit<Doc, "id" | "createdAt">>;

type DocumentsState = {
  docs: Record<string, Doc>;
  folders: Record<string, Folder>;
  tags: Record<string, Tag>;
  hydrated: boolean;
  create: (parentId?: string | null, title?: string) => string;
  update: (id: string, patch: DocPatch) => void;
  archive: (id: string) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;

  createFolder: (parentId?: string | null, name?: string) => string;
  renameFolder: (id: string, name: string) => void;
  moveFolder: (id: string, parentId: string | null) => void;
  deleteFolder: (id: string) => void;
  addDocToFolder: (folderId: string, docId: string) => void;
  removeDocFromFolder: (folderId: string, docId: string) => void;

  createTag: (name: string, color: string) => string;
  updateTag: (id: string, patch: Partial<Pick<Tag, "name" | "color">>) => void;
  deleteTag: (id: string) => void;
  addTagToDoc: (docId: string, tagId: string) => void;
  removeTagFromDoc: (docId: string, tagId: string) => void;
};

function descendants(docs: Record<string, Doc>, id: string): string[] {
  const children = Object.values(docs).filter((d) => d.parentId === id);
  return children.flatMap((c) => [c.id, ...descendants(docs, c.id)]);
}

export function folderDescendants(folders: Record<string, Folder>, id: string): string[] {
  const children = Object.values(folders).filter((f) => f.parentId === id);
  return children.flatMap((c) => [c.id, ...folderDescendants(folders, c.id)]);
}

export const useDocuments = create<DocumentsState>()(
  persist(
    (set, get) => ({
      docs: {},
      folders: {},
      tags: {},
      hydrated: false,

      create: (parentId = null, title = "") => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((s) => ({
          docs: {
            ...s.docs,
            [id]: {
              id,
              title,
              parentId,
              isArchived: false,
              isPublished: false,
              isFavorite: false,
              createdAt: now,
              updatedAt: now,
            },
          },
        }));
        return id;
      },

      update: (id, patch) =>
        set((s) => {
          const doc = s.docs[id];
          if (!doc) return s;
          return { docs: { ...s.docs, [id]: { ...doc, ...patch, updatedAt: Date.now() } } };
        }),

      // Arquivar uma página arquiva também todas as subpáginas.
      archive: (id) =>
        set((s) => {
          const docs = { ...s.docs };
          for (const target of [id, ...descendants(s.docs, id)]) {
            docs[target] = { ...docs[target], isArchived: true, updatedAt: Date.now() };
          }
          return { docs };
        }),

      restore: (id) =>
        set((s) => {
          const docs = { ...s.docs };
          const doc = docs[id];
          // Se o pai continua na lixeira, a página volta para a raiz.
          const parentId = doc.parentId && docs[doc.parentId]?.isArchived ? null : doc.parentId;
          for (const target of [id, ...descendants(s.docs, id)]) {
            docs[target] = { ...docs[target], isArchived: false, updatedAt: Date.now() };
          }
          docs[id] = { ...docs[id], parentId };
          return { docs };
        }),

      // Excluir de vez também tira a página (e as subpáginas) de todas as pastas.
      remove: (id) => {
        const toRemove = new Set([id, ...descendants(get().docs, id)]);
        for (const target of toRemove) void deletePageContent(target);
        set((s) => ({
          docs: Object.fromEntries(Object.entries(s.docs).filter(([key]) => !toRemove.has(key))),
          folders: Object.fromEntries(
            Object.entries(s.folders).map(([key, f]) => [
              key,
              f.docIds.some((d) => toRemove.has(d)) ? { ...f, docIds: f.docIds.filter((d) => !toRemove.has(d)) } : f,
            ]),
          ),
        }));
      },

      createFolder: (parentId = null, name = "Nova pasta") => {
        const id = crypto.randomUUID();
        set((s) => ({
          folders: { ...s.folders, [id]: { id, name, parentId, docIds: [], createdAt: Date.now() } },
        }));
        return id;
      },

      renameFolder: (id, name) =>
        set((s) => (s.folders[id] ? { folders: { ...s.folders, [id]: { ...s.folders[id], name } } } : s)),

      // Não deixa mover uma pasta para dentro dela mesma ou de uma subpasta sua.
      moveFolder: (id, parentId) =>
        set((s) => {
          const folder = s.folders[id];
          if (!folder || folder.parentId === parentId) return s;
          if (parentId && (parentId === id || folderDescendants(s.folders, id).includes(parentId))) return s;
          return { folders: { ...s.folders, [id]: { ...folder, parentId } } };
        }),

      // Apagar a pasta apaga as subpastas, mas nunca as páginas.
      deleteFolder: (id) =>
        set((s) => {
          const toRemove = new Set([id, ...folderDescendants(s.folders, id)]);
          return { folders: Object.fromEntries(Object.entries(s.folders).filter(([key]) => !toRemove.has(key))) };
        }),

      addDocToFolder: (folderId, docId) =>
        set((s) => {
          const folder = s.folders[folderId];
          if (!folder || folder.docIds.includes(docId)) return s;
          return { folders: { ...s.folders, [folderId]: { ...folder, docIds: [...folder.docIds, docId] } } };
        }),

      removeDocFromFolder: (folderId, docId) =>
        set((s) => {
          const folder = s.folders[folderId];
          if (!folder) return s;
          return {
            folders: { ...s.folders, [folderId]: { ...folder, docIds: folder.docIds.filter((d) => d !== docId) } },
          };
        }),

      createTag: (name, color) => {
        const id = crypto.randomUUID();
        set((s) => ({ tags: { ...s.tags, [id]: { id, name, color, createdAt: Date.now() } } }));
        return id;
      },

      updateTag: (id, patch) =>
        set((s) => (s.tags[id] ? { tags: { ...s.tags, [id]: { ...s.tags[id], ...patch } } } : s)),

      // Apagar a etiqueta tira ela de todas as páginas.
      deleteTag: (id) =>
        set((s) => {
          const tags = { ...s.tags };
          delete tags[id];
          const docs = Object.fromEntries(
            Object.entries(s.docs).map(([key, d]) => [
              key,
              d.tagIds?.includes(id) ? { ...d, tagIds: d.tagIds.filter((t) => t !== id) } : d,
            ]),
          );
          return { tags, docs };
        }),

      addTagToDoc: (docId, tagId) => {
        const doc = get().docs[docId];
        if (!doc || doc.tagIds?.includes(tagId)) return;
        get().update(docId, { tagIds: [...(doc.tagIds ?? []), tagId] });
      },

      removeTagFromDoc: (docId, tagId) => {
        const doc = get().docs[docId];
        if (!doc?.tagIds?.includes(tagId)) return;
        get().update(docId, { tagIds: doc.tagIds.filter((t) => t !== tagId) });
      },
    }),
    {
      name: "slash-documents",
      storage: createJSONStorage(() => appStorage),
      partialize: (s) => ({ docs: s.docs, folders: s.folders, tags: s.tags }),
      onRehydrateStorage: () => () => {
        migrateContent()
          .catch((error) => console.error("Falha ao migrar o conteúdo das páginas", error))
          .finally(() => useDocuments.setState({ hydrated: true }));
      },
    },
  ),
);

/**
 * Dados antigos guardavam o conteúdo de todas as páginas dentro de slash-documents.json.
 * Move cada conteúdo para o arquivo da página e só então tira do arquivo principal.
 * Antes, guarda uma cópia do arquivo original em slash-documents-antes-da-migracao.json.
 * Se algo falhar, nada é removido: a página continua abrindo pelo conteúdo antigo.
 */
async function migrateContent() {
  const storage = backend();
  const legacy = Object.values(useDocuments.getState().docs).filter((d) => d.content !== undefined);
  if (!storage || legacy.length === 0) return;

  const raw = await storage.getItem("slash-documents");
  if (raw) await storage.setItem("slash-documents-antes-da-migracao", raw);
  await Promise.all(legacy.filter((d) => d.content).map((d) => storage.setItem(`page-${d.id}`, d.content!)));

  const migrated = new Set(legacy.map((d) => d.id));
  useDocuments.setState((s) => ({
    docs: Object.fromEntries(
      Object.entries(s.docs).map(([key, d]) => {
        if (!migrated.has(key)) return [key, d];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = d;
        return [key, rest];
      }),
    ),
  }));
}

export function sortDocs(docs: Doc[]) {
  return [...docs].sort((a, b) => a.createdAt - b.createdAt);
}

export function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

/** Etiquetas da página, na ordem em que foram aplicadas (ignora as que foram apagadas). */
export function docTags(doc: Doc, tags: Record<string, Tag>) {
  return (doc.tagIds ?? []).map((id) => tags[id]).filter(Boolean);
}
