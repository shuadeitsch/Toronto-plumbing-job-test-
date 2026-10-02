// All "day" logic runs on Toronto calendar dates (YYYY-MM-DD strings),
// so a quote sent at 11pm doesn't count as "tomorrow" because of UTC.

export const TZ = "America/Toronto";

export function todayISO(now: Date = new Date()): string {
  return toDateISO(now);
}

export function toDateISO(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parse(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  return new Date(parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

export function weekday(iso: string): string {
  return new Date(parse(iso)).toLocaleDateString("en-CA", { weekday: "long", timeZone: "UTC" });
}

/** Monday-start week containing iso. */
export function weekStart(iso: string): string {
  const dow = new Date(parse(iso)).getUTCDay(); // 0 = Sun
  return addDays(iso, -((dow + 6) % 7));
}

export function formatDay(iso: string | null, opts: { weekday?: boolean } = {}): string {
  if (!iso) return "";
  return new Date(parse(iso)).toLocaleDateString("en-CA", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(opts.weekday ? { weekday: "short" } : {}),
  });
}

/** "today", "tomorrow", "in 6 days", "3 days ago" */
export function relativeDay(iso: string | null, today = todayISO()): string {
  if (!iso) return "";
  const n = daysBetween(today, iso.slice(0, 10));
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 1) return `in ${n} days`;
  return `${-n} days ago`;
}

export function formatMoney(n: number | null): string {
  if (n == null) return "";
  return n.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}
