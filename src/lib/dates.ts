// Datas da agenda são guardadas como "AAAA-MM-DD" no fuso local, e horários como minutos desde 00:00.
// Assim um evento das 9h continua às 9h mesmo se o computador mudar de fuso.

export type DateKey = string;

export function toKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

export function isValidKey(key: string | null): key is DateKey {
  return !!key && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(fromKey(key).getTime());
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return toKey(date);
}

export function addMonths(key: DateKey, months: number): DateKey {
  const date = fromKey(key);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // 31/jan + 1 mês = 28 ou 29/fev, não 3/mar.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toKey(date);
}

/** Semana começa no domingo, como nos calendários brasileiros. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -fromKey(key).getDay());
}

export function weekDays(key: DateKey): DateKey[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** As semanas (domingo a sábado) que cobrem o mês inteiro: 5 ou 6 linhas. */
export function monthWeeks(key: DateKey): DateKey[][] {
  const date = fromKey(key);
  const first = toKey(new Date(date.getFullYear(), date.getMonth(), 1));
  const last = toKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  const weeks: DateKey[][] = [];
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

export function sameMonth(a: DateKey, b: DateKey) {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function minutesNow() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** 570 → "09:30" */
export function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:30" → 570 */
export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes <= 24 * 60 ? minutes : null;
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", options);
const weekdayShort = fmt({ weekday: "short" });
const weekdayLong = fmt({ weekday: "long" });
const monthLong = fmt({ month: "long" });
const monthShort = fmt({ month: "short" });

const clean = (s: string) => s.replace(".", "");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "dom", "seg", ... */
export function weekdayName(key: DateKey) {
  return clean(weekdayShort.format(fromKey(key)));
}

/** "Segunda-feira, 16 de novembro" */
export function longDate(key: DateKey) {
  const date = fromKey(key);
  return `${capitalize(weekdayLong.format(date))}, ${date.getDate()} de ${monthLong.format(date)}`;
}

/** "16 de novembro de 2026", usado como título da nota do dia. */
export function fullDate(key: DateKey) {
  const date = fromKey(key);
  return `${date.getDate()} de ${monthLong.format(date)} de ${date.getFullYear()}`;
}

/** "16 nov" */
export function shortDate(key: DateKey) {
  const date = fromKey(key);
  return `${date.getDate()} ${clean(monthShort.format(date))}`;
}

/** Título do período mostrado no topo da agenda. */
export function periodLabel(key: DateKey, mode: "day" | "week" | "month") {
  const date = fromKey(key);
  if (mode === "day") return longDate(key);
  if (mode === "month") return `${capitalize(monthLong.format(date))} de ${date.getFullYear()}`;
  const days = weekDays(key);
  const first = fromKey(days[0]);
  const last = fromKey(days[6]);
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} de ${monthLong.format(last)} de ${last.getFullYear()}`;
  }
  const year = first.getFullYear() === last.getFullYear() ? "" : ` de ${first.getFullYear()}`;
  return `${shortDate(days[0])}${year} – ${shortDate(days[6])} de ${last.getFullYear()}`;
}
