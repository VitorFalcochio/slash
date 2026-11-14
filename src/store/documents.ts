"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "@/lib/storage";

export type Doc = {
  id: string;
  title: string;
  parentId: string | null;
  icon?: string;
  coverImage?: string;
  /** Blocos do BlockNote serializados em JSON. */
  content?: string;
  isArchived: boolean;
  isPublished: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
};

type DocPatch = Partial<Omit<Doc, "id" | "createdAt">>;

type DocumentsState = {
  docs: Record<string, Doc>;
  hydrated: boolean;
  create: (parentId?: string | null, title?: string) => string;
  update: (id: string, patch: DocPatch) => void;
  archive: (id: string) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;
};

function descendants(docs: Record<string, Doc>, id: string): string[] {
  const children = Object.values(docs).filter((d) => d.parentId === id);
  return children.flatMap((c) => [c.id, ...descendants(docs, c.id)]);
}

export const useDocuments = create<DocumentsState>()(
  persist(
    (set, get) => ({
      docs: {},
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

      remove: (id) => {
        const toRemove = new Set([id, ...descendants(get().docs, id)]);
        set((s) => ({
          docs: Object.fromEntries(Object.entries(s.docs).filter(([key]) => !toRemove.has(key))),
        }));
      },
    }),
    {
      name: "slash-documents",
      storage: createJSONStorage(() => appStorage),
      partialize: (s) => ({ docs: s.docs }),
      onRehydrateStorage: () => () => useDocuments.setState({ hydrated: true }),
    },
  ),
);

export function sortDocs(docs: Doc[]) {
  return [...docs].sort((a, b) => a.createdAt - b.createdAt);
}
