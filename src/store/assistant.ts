"use client";

// Conversa com o assistente de IA. Fica só na memória: some ao fechar o app.
import { create } from "zustand";
import { aiBridge, aiModel, assistantSystemPrompt, buildCorpus } from "@/lib/ai";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  /** O que vai para a IA. */
  text: string;
  /** O que aparece no balão do usuário, quando diferente do texto enviado (ex.: "Resumir esta página"). */
  display?: string;
  status: "streaming" | "done" | "error";
  /** Resposta que pode ser inserida no topo desta página (resumos). */
  insertInto?: string;
};

type AskOptions = { display?: string; insertInto?: string; currentId?: string | null };

type AssistantState = {
  messages: ChatMessage[];
  /** Pedido em andamento (para poder parar). */
  streamId: string | null;
  /** Quantas páginas foram enviadas como contexto na última pergunta. */
  context: { included: number; total: number } | null;
  ask: (prompt: string, options?: AskOptions) => Promise<void>;
  stop: () => void;
  reset: () => void;
};

export const useAssistant = create<AssistantState>((set, get) => ({
  messages: [],
  streamId: null,
  context: null,

  ask: async (prompt, { display, insertInto, currentId } = {}) => {
    if (get().streamId) return;
    const answerId = crypto.randomUUID();
    const history = get()
      .messages.filter((m) => m.status === "done")
      .map((m) => ({ role: m.role, text: m.text }));
    const patch = (p: Partial<ChatMessage>) =>
      set((s) => ({ messages: s.messages.map((m) => (m.id === answerId ? { ...m, ...p } : m)) }));

    set((s) => ({
      streamId: answerId,
      messages: [
        ...s.messages,
        { id: crypto.randomUUID(), role: "user", text: prompt, display, status: "done" },
        { id: answerId, role: "assistant", text: "", status: "streaming", insertInto },
      ],
    }));

    const bridge = aiBridge();
    if (!bridge) {
      patch({ status: "error", text: "O assistente só funciona no app para desktop." });
      return set({ streamId: null });
    }

    try {
      const corpus = await buildCorpus(currentId);
      set({ context: { included: corpus.included, total: corpus.total } });
      if (get().streamId !== answerId) return; // parado enquanto lia as páginas
      await bridge.stream(
        answerId,
        {
          model: aiModel(),
          system: assistantSystemPrompt(corpus, currentId),
          messages: [...history, { role: "user", text: prompt }],
        },
        {
          onChunk: (chunk) =>
            set((s) => ({ messages: s.messages.map((m) => (m.id === answerId ? { ...m, text: m.text + chunk } : m)) })),
          onDone: () => {
            const answer = get().messages.find((m) => m.id === answerId);
            patch(answer?.text ? { status: "done" } : { status: "error", text: "A IA não respondeu nada. Tente de novo." });
            set({ streamId: null });
          },
          onError: (message) => {
            patch({ status: "error", text: message });
            set({ streamId: null });
          },
        },
      );
    } catch (error) {
      patch({ status: "error", text: error instanceof Error ? error.message : String(error) });
      set({ streamId: null });
    }
  },

  stop: () => {
    const id = get().streamId;
    if (!id) return;
    void aiBridge()?.cancel(id);
    set((s) => ({
      streamId: null,
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, status: m.text ? "done" : "error", text: m.text || "Cancelado." } : m,
      ),
    }));
  },

  reset: () => {
    get().stop();
    set({ messages: [], context: null });
  },
}));
