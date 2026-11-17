"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DRAG_TASK, dragHas } from "@/lib/dnd";
import { formatTime, fromKey, minutesNow, todayKey, weekdayName, type DateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { sortEvents, usePlanner, type CalendarEvent } from "@/store/planner";
import { newDraft, type EditorTarget } from "./event-editor";
import { eventStyle, eventTitle } from "./event-style";

const HOUR = 48; // altura de uma hora, em px
const SNAP = 15; // arrastar anda de 15 em 15 minutos
const DAY = 24 * 60;
const MIN_VISIBLE = 22; // eventos curtos ainda ficam clicáveis

const toPx = (minutes: number) => (minutes * HOUR) / 60;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

type Drag =
  | { kind: "create"; day: number; anchor: number; current: number }
  | { kind: "move"; id: string; day: number; start: number; duration: number; offset: number; x: number; y: number; moved: boolean }
  | { kind: "resize"; id: string; day: number; start: number; end: number };

type Props = {
  days: DateKey[];
  selected: DateKey;
  onOpen: (target: EditorTarget) => void;
  onDayClick: (day: DateKey) => void;
};

/** Grade de horários das visões Dia e Semana. */
export function TimeGrid({ days, selected, onOpen, onDayClick }: Props) {
  const events = usePlanner((s) => s.events);
  const tasks = usePlanner((s) => s.tasks);
  const { updateEvent, scheduleTask } = usePlanner();
  const today = todayKey();
  const [now, setNow] = useState(minutesNow);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [taskDrop, setTaskDrop] = useState<{ day: number; start: number } | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showsToday = days.includes(today);

  useEffect(() => {
    const timer = setInterval(() => setNow(minutesNow()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Abre já no horário útil: perto de agora (se hoje está na tela) ou às 7h.
  useEffect(() => {
    const target = showsToday ? Math.max(0, minutesNow() - 90) : 7 * 60;
    if (scrollRef.current) scrollRef.current.scrollTop = toPx(target);
  }, [showsToday]);

  const setDragState = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  /** Dia (coluna) e minuto sob o ponteiro. */
  const pointAt = (clientX: number, clientY: number) => {
    const rect = gridRef.current!.getBoundingClientRect();
    const day = clamp(Math.floor(((clientX - rect.left) / rect.width) * days.length), 0, days.length - 1);
    const minute = clamp(((clientY - rect.top) / HOUR) * 60, 0, DAY);
    return { day, minute };
  };

  const capture = (e: ReactPointerEvent) => gridRef.current?.setPointerCapture(e.pointerId);

  const onGridDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const { day, minute } = pointAt(e.clientX, e.clientY);
    const anchor = Math.floor(minute / SNAP) * SNAP;
    capture(e);
    setDragState({ kind: "create", day, anchor, current: anchor });
  };

  const onEventDown = (e: ReactPointerEvent, event: CalendarEvent, day: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const { minute } = pointAt(e.clientX, e.clientY);
    capture(e);
    setDragState({
      kind: "move",
      id: event.id,
      day,
      start: event.start,
      duration: event.end - event.start,
      offset: minute - event.start,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    });
  };

  const onResizeDown = (e: ReactPointerEvent, event: CalendarEvent, day: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capture(e);
    setDragState({ kind: "resize", id: event.id, day, start: event.start, end: event.end });
  };

  const onMove = (e: ReactPointerEvent) => {
    const current = dragRef.current;
    if (!current) return;
    const { day, minute } = pointAt(e.clientX, e.clientY);
    if (current.kind === "create") {
      setDragState({ ...current, current: Math.round(minute / SNAP) * SNAP });
    } else if (current.kind === "move") {
      const moved = current.moved || Math.hypot(e.clientX - current.x, e.clientY - current.y) > 4;
      if (!moved) return;
      const start = clamp(Math.round((minute - current.offset) / SNAP) * SNAP, 0, DAY - current.duration);
      setDragState({ ...current, moved, day, start });
    } else {
      setDragState({ ...current, end: clamp(Math.round(minute / SNAP) * SNAP, current.start + SNAP, DAY) });
    }
  };

  const onUp = () => {
    const current = dragRef.current;
    setDragState(null);
    if (!current) return;
    if (current.kind === "create") {
      let start = Math.min(current.anchor, current.current);
      let end = Math.max(current.anchor, current.current);
      // Clique simples: evento de 1 hora começando na meia hora clicada.
      if (end - start < SNAP) {
        start = Math.floor(current.anchor / 30) * 30;
        end = start + 60;
      }
      onOpen({ draft: newDraft(days[current.day], start, end) });
    } else if (current.kind === "move") {
      if (!current.moved) onOpen({ id: current.id });
      else updateEvent(current.id, { date: days[current.day], start: current.start, end: current.start + current.duration });
    } else {
      updateEvent(current.id, { end: current.end });
    }
  };

  /** Posição do evento levando em conta o arraste em andamento. */
  const placed = (event: CalendarEvent): { day: DateKey; start: number; end: number } => {
    if (drag?.kind === "move" && drag.id === event.id && drag.moved) {
      return { day: days[drag.day], start: drag.start, end: drag.start + drag.duration };
    }
    if (drag?.kind === "resize" && drag.id === event.id) return { day: event.date, start: event.start, end: drag.end };
    return { day: event.date, start: event.start, end: event.end };
  };

  const timed = Object.values(events).filter((e) => !e.allDay);
  const allDay = Object.values(events).filter((e) => e.allDay);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabeçalho com os dias */}
      <div className="flex shrink-0 overflow-y-hidden border-b border-border [scrollbar-gutter:stable]">
        <div className="w-14 shrink-0" />
        {days.map((day) => {
          const isToday = day === today;
          return (
            <button
              key={day}
              onClick={() => onDayClick(day)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 hover:bg-hover",
                days.length > 1 && day === selected && "bg-hover",
              )}
            >
              <span className={cn("text-[11px] font-medium uppercase", isToday ? "text-accent" : "text-muted")}>
                {weekdayName(day)}
              </span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-lg leading-none",
                  isToday && "bg-accent font-semibold text-white",
                )}
              >
                {fromKey(day).getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Eventos de dia inteiro */}
      <div className="flex shrink-0 overflow-y-hidden border-b border-border [scrollbar-gutter:stable]">
        <div className="flex w-14 shrink-0 items-center justify-end pr-2 text-[10px] text-muted">dia todo</div>
        {days.map((day) => (
          <div
            key={day}
            onClick={() => onOpen({ draft: { ...newDraft(day), allDay: true, start: 0, end: DAY } })}
            className="flex min-h-7 min-w-0 flex-1 cursor-pointer flex-col gap-0.5 border-l border-border p-0.5"
          >
            {sortEvents(allDay.filter((e) => e.date === day)).map((event) => (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen({ id: event.id });
                }}
                style={eventStyle(event.color)}
                className="truncate rounded px-1.5 py-0.5 text-left text-xs font-medium"
              >
                {eventTitle(event.title)}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Horários */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="relative flex" style={{ height: toPx(DAY) }}>
          <div className="relative w-14 shrink-0">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-muted tabular-nums"
                style={{ top: toPx(h * 60) }}
              >
                {formatTime(h * 60)}
              </span>
            ))}
          </div>

          <div
            ref={gridRef}
            onPointerDown={onGridDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => setDragState(null)}
            onDragOver={(e) => {
              if (!dragHas(e, DRAG_TASK)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              const { day, minute } = pointAt(e.clientX, e.clientY);
              setTaskDrop({ day, start: clamp(Math.floor(minute / SNAP) * SNAP, 0, DAY - 60) });
            }}
            onDragLeave={() => setTaskDrop(null)}
            onDrop={(e) => {
              const taskId = e.dataTransfer.getData(DRAG_TASK);
              const target = taskDrop;
              setTaskDrop(null);
              if (!taskId || !target) return;
              e.preventDefault();
              scheduleTask(taskId, days[target.day], target.start);
            }}
            className={cn("relative flex flex-1 select-none", drag && "cursor-grabbing")}
            style={{
              backgroundImage: "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: `100% ${HOUR}px`,
            }}
          >
            {days.map((day, index) => {
              const dayEvents = timed
                .map((event) => ({ event, ...placed(event) }))
                .filter((p) => p.day === day);
              const layout = layoutColumns(dayEvents.map((p) => ({ id: p.event.id, start: p.start, end: p.end })));

              return (
                <div key={day} className={cn("relative min-w-0 flex-1 border-l border-border", day === today && "bg-accent/[0.03]")}>
                  {dayEvents.map(({ event, start, end }) => {
                    const { col, cols } = layout.get(event.id)!;
                    const height = Math.max(toPx(end - start), MIN_VISIBLE);
                    const task = event.taskId ? tasks[event.taskId] : undefined;
                    const active = drag && "id" in drag && drag.id === event.id;
                    return (
                      <div
                        key={event.id}
                        onPointerDown={(e) => onEventDown(e, event, index)}
                        style={{
                          ...eventStyle(event.color, task?.done),
                          top: toPx(start),
                          height,
                          left: `calc(${(col / cols) * 100}% + 2px)`,
                          width: `calc(${100 / cols}% - 4px)`,
                        }}
                        className={cn(
                          "group/event absolute overflow-hidden rounded-md px-1.5 py-0.5 text-xs leading-tight",
                          active ? "z-20 shadow-lg ring-1 ring-accent" : "z-10 cursor-pointer hover:brightness-95",
                        )}
                      >
                        <p className={cn("truncate font-medium", task?.done && "text-muted line-through")}>
                          {eventTitle(event.title)}
                        </p>
                        {height >= 34 && (
                          <p className="truncate text-[11px] text-muted">
                            {formatTime(start)} – {formatTime(end)}
                            {event.location ? ` · ${event.location}` : ""}
                          </p>
                        )}
                        <div
                          onPointerDown={(e) => onResizeDown(e, event, index)}
                          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                        />
                      </div>
                    );
                  })}

                  {drag?.kind === "create" && drag.day === index && drag.current !== drag.anchor && (
                    <Ghost start={Math.min(drag.anchor, drag.current)} end={Math.max(drag.anchor, drag.current)} />
                  )}
                  {taskDrop?.day === index && <Ghost start={taskDrop.start} end={taskDrop.start + 60} />}

                  {day === today && (
                    <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: toPx(now) }}>
                      <div className="absolute -top-[5px] -left-[5px] size-2.5 rounded-full bg-red-500" />
                      <div className="h-0.5 bg-red-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Ghost({ start, end }: { start: number; end: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0.5 z-20 rounded-md border border-dashed border-accent bg-accent/15 px-1.5 py-0.5 text-[11px] text-accent"
      style={{ top: toPx(start), height: Math.max(toPx(end - start), MIN_VISIBLE) }}
    >
      {formatTime(start)} – {formatTime(end)}
    </div>
  );
}

/**
 * Eventos que se sobrepõem ficam lado a lado: cada um recebe uma coluna dentro do seu grupo.
 * Um grupo termina quando aparece um evento que começa depois de todos os anteriores acabarem.
 */
function layoutColumns(items: { id: string; start: number; end: number }[]) {
  const result = new Map<string, { col: number; cols: number }>();
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  let group: string[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    for (const id of group) result.set(id, { col: result.get(id)!.col, cols: columnEnds.length });
    group = [];
    columnEnds = [];
  };

  for (const item of sorted) {
    const end = Math.max(item.end, item.start + 15);
    if (item.start >= groupEnd) closeGroup();
    let col = columnEnds.findIndex((colEnd) => colEnd <= item.start);
    if (col === -1) col = columnEnds.push(end) - 1;
    else columnEnds[col] = end;
    result.set(item.id, { col, cols: 1 });
    group.push(item.id);
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return result;
}
