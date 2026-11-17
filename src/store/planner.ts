"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { fullDate, type DateKey } from "@/lib/dates";
import { appStorage } from "@/lib/storage";
import { useDocuments } from "./documents";

/** Compromisso na agenda. Horários em minutos desde 00:00 do dia `date`. */
export type CalendarEvent = {
  id: string;
  title: string;
  date: DateKey;
  start: number;
  end: number;
  allDay: boolean;
  color: string;
  location?: string;
  notes?: string;
  /** Quando o evento é um bloco de horário reservado para uma tarefa. */
  taskId?: string;
  createdAt: number;
};

export type Priority = 0 | 1 | 2 | 3;

/** Tarefa do planejamento diário. Sem data, fica na caixa de entrada. */
export type Task = {
  id: string;
  title: string;
  date: DateKey | null;
  done: boolean;
  priority: Priority;
  createdAt: number;
  doneAt?: number;
};

type EventInput = Omit<CalendarEvent, "id" | "createdAt">;

type PlannerState = {
  events: Record<string, CalendarEvent>;
  tasks: Record<string, Task>;
  /** Data → id da página que é a nota daquele dia. */
  dailyNotes: Record<DateKey, string>;
  /** Página "Diário" que agrupa as notas do dia na barra lateral. */
  journalId: string | null;
  hydrated: boolean;

  createEvent: (input: EventInput) => string;
  updateEvent: (id: string, patch: Partial<EventInput>) => void;
  deleteEvent: (id: string) => void;

  createTask: (title: string, date: DateKey | null, priority?: Priority) => string;
  updateTask: (id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  /** Reserva um horário na agenda para a tarefa (e a coloca nesse dia). */
  scheduleTask: (taskId: string, date: DateKey, start: number, duration?: number) => string | null;

  /** Abre (ou cria) a nota do dia e devolve o id da página. */
  openDailyNote: (date: DateKey) => string;
};

export const DEFAULT_EVENT_COLOR = "blue";
export const TASK_BLOCK_COLOR = "purple";

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => ({
      events: {},
      tasks: {},
      dailyNotes: {},
      journalId: null,
      hydrated: false,

      createEvent: (input) => {
        const id = crypto.randomUUID();
        set((s) => ({ events: { ...s.events, [id]: { ...input, id, createdAt: Date.now() } } }));
        return id;
      },

      updateEvent: (id, patch) =>
        set((s) => {
          const event = s.events[id];
          if (!event) return s;
          const events = { ...s.events, [id]: { ...event, ...patch } };
          // Renomear o bloco de horário renomeia a tarefa (e os outros blocos dela).
          const task = event.taskId ? s.tasks[event.taskId] : undefined;
          if (!task || !patch.title || patch.title === task.title) return { events };
          for (const [key, e] of Object.entries(events)) {
            if (e.taskId === task.id) events[key] = { ...e, title: patch.title };
          }
          return { events, tasks: { ...s.tasks, [task.id]: { ...task, title: patch.title } } };
        }),

      deleteEvent: (id) =>
        set((s) => {
          const events = { ...s.events };
          delete events[id];
          return { events };
        }),

      createTask: (title, date, priority = 0) => {
        const id = crypto.randomUUID();
        set((s) => ({
          tasks: { ...s.tasks, [id]: { id, title, date, priority, done: false, createdAt: Date.now() } },
        }));
        return id;
      },

      updateTask: (id, patch) =>
        set((s) => {
          const task = s.tasks[id];
          if (!task) return s;
          const next = { ...task, ...patch };
          // O bloco na agenda acompanha o nome da tarefa.
          const events =
            patch.title === undefined
              ? s.events
              : Object.fromEntries(
                  Object.entries(s.events).map(([key, e]) => [key, e.taskId === id ? { ...e, title: next.title } : e]),
                );
          return { tasks: { ...s.tasks, [id]: next }, events };
        }),

      toggleTask: (id) => {
        const task = get().tasks[id];
        if (!task) return;
        get().updateTask(id, { done: !task.done, doneAt: task.done ? undefined : Date.now() });
      },

      // Apagar a tarefa apaga também os blocos de horário dela.
      deleteTask: (id) =>
        set((s) => {
          const tasks = { ...s.tasks };
          delete tasks[id];
          return {
            tasks,
            events: Object.fromEntries(Object.entries(s.events).filter(([, e]) => e.taskId !== id)),
          };
        }),

      scheduleTask: (taskId, date, start, duration = 60) => {
        const task = get().tasks[taskId];
        if (!task) return null;
        if (task.date !== date) get().updateTask(taskId, { date });
        return get().createEvent({
          title: task.title,
          date,
          start,
          end: Math.min(24 * 60, start + duration),
          allDay: false,
          color: TASK_BLOCK_COLOR,
          taskId,
        });
      },

      openDailyNote: (date) => {
        const docs = useDocuments.getState();
        const existing = get().dailyNotes[date];
        if (existing && docs.docs[existing]) {
          if (docs.docs[existing].isArchived) docs.restore(existing);
          return existing;
        }

        let journalId = get().journalId;
        if (!journalId || !docs.docs[journalId] || docs.docs[journalId].isArchived) {
          journalId = docs.create(null, "Diário");
          docs.update(journalId, { icon: "📔" });
        }
        const id = docs.create(journalId, fullDate(date));
        docs.update(id, { icon: "🗓️" });
        set((s) => ({ journalId, dailyNotes: { ...s.dailyNotes, [date]: id } }));
        return id;
      },
    }),
    {
      name: "slash-planner",
      storage: createJSONStorage(() => appStorage),
      partialize: (s) => ({ events: s.events, tasks: s.tasks, dailyNotes: s.dailyNotes, journalId: s.journalId }),
      onRehydrateStorage: () => () => usePlanner.setState({ hydrated: true }),
    },
  ),
);

/** Ordem na lista: não concluídas primeiro, depois prioridade (alta → baixa), depois criação. */
export function sortTasks(tasks: Task[]) {
  return [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || b.priority - a.priority || a.createdAt - b.createdAt,
  );
}

export function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start || a.end - b.end);
}
