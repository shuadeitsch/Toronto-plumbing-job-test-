import { addDays, daysBetween, toDateISO, todayISO } from "./dates";
import type { Activity, Book, Contact, Job, Stage } from "./types";
import { OPEN_STAGES } from "./types";

export const QUOTE_NUDGE_DAYS = 5;
export const QUIET_DAYS = 30;

const byNewest = (a: Activity, b: Activity) => b.created_at.localeCompare(a.created_at);

export function activitiesFor(book: Book, contactId: string): Activity[] {
  return book.activities.filter((a) => a.contact_id === contactId).sort(byNewest);
}

export function jobsFor(book: Book, contactId: string): Job[] {
  return book.jobs
    .filter((j) => j.contact_id === contactId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function contactById(book: Book, id: string): Contact | undefined {
  return book.contacts.find((c) => c.id === id);
}

export function jobById(book: Book, id: string): Job | undefined {
  return book.jobs.find((j) => j.id === id);
}

/** Last date (Toronto) Mara had any contact with this person. Falls back to when they were added. */
export function lastTouch(book: Book, contact: Contact): string {
  const latest = book.activities
    .filter((a) => a.contact_id === contact.id)
    .reduce<string>((max, a) => (a.created_at > max ? a.created_at : max), contact.created_at);
  return toDateISO(latest);
}

export interface WaitingQuote {
  job: Job;
  contact: Contact;
  daysSinceQuote: number;
  daysSinceNudge: number; // since the quote, or since her last follow-up, whichever is later
  lastFollowUp: string | null;
}

/**
 * Quotes that have sat with no reply. A quote is "waiting" when the job is still
 * in Quoted, nothing was logged as "heard back" since it was sent, and it's been
 * at least `minDays` since the quote or Mara's last follow-up.
 */
export function waitingQuotes(book: Book, minDays = QUOTE_NUDGE_DAYS, today = todayISO()): WaitingQuote[] {
  const out: WaitingQuote[] = [];
  for (const job of book.jobs) {
    if (job.stage !== "quoted" || !job.quoted_on) continue;
    const contact = contactById(book, job.contact_id);
    if (!contact) continue;
    const since = book.activities.filter(
      (a) => a.contact_id === job.contact_id && toDateISO(a.created_at) >= job.quoted_on!,
    );
    if (since.some((a) => a.kind === "heard_back")) continue;
    const followUps = since.filter((a) => a.kind === "reached_out").sort(byNewest);
    const lastFollowUp = followUps[0] ? toDateISO(followUps[0].created_at) : null;
    const anchor = lastFollowUp && lastFollowUp > job.quoted_on ? lastFollowUp : job.quoted_on;
    const daysSinceNudge = daysBetween(anchor, today);
    if (daysSinceNudge < minDays) continue;
    out.push({ job, contact, daysSinceQuote: daysBetween(job.quoted_on, today), daysSinceNudge, lastFollowUp });
  }
  return out.sort((a, b) => b.daysSinceNudge - a.daysSinceNudge);
}

/** True when nothing was logged as "heard back" from this client since the job's quote went out. */
export function noReplySinceQuote(book: Book, job: Job): boolean {
  if (!job.quoted_on) return false;
  return !book.activities.some(
    (a) => a.contact_id === job.contact_id && a.kind === "heard_back" && toDateISO(a.created_at) >= job.quoted_on!,
  );
}

export interface QuietContact {
  contact: Contact;
  lastTouch: string;
  days: number;
  openJobs: Job[];
}

export function quietContacts(book: Book, minDays = QUIET_DAYS, today = todayISO()): QuietContact[] {
  return book.contacts
    .map((contact) => {
      const lt = lastTouch(book, contact);
      return {
        contact,
        lastTouch: lt,
        days: daysBetween(lt, today),
        openJobs: book.jobs.filter((j) => j.contact_id === contact.id && OPEN_STAGES.includes(j.stage)),
      };
    })
    .filter((q) => q.days >= minDays)
    .sort((a, b) => b.days - a.days);
}

export function followUpsDue(book: Book, today = todayISO()) {
  return book.contacts
    .filter((c) => c.follow_up_on && c.follow_up_on <= today)
    .sort((a, b) => a.follow_up_on!.localeCompare(b.follow_up_on!));
}

export function upcomingFollowUps(book: Book, days = 7, today = todayISO()) {
  const end = addDays(today, days);
  return book.contacts
    .filter((c) => c.follow_up_on && c.follow_up_on > today && c.follow_up_on <= end)
    .sort((a, b) => a.follow_up_on!.localeCompare(b.follow_up_on!));
}

export function bookedWithin(book: Book, days = 14, today = todayISO()) {
  const end = addDays(today, days);
  return book.jobs
    .filter((j) => j.stage === "booked" && j.wanted_on && j.wanted_on >= today && j.wanted_on <= end)
    .sort((a, b) => a.wanted_on!.localeCompare(b.wanted_on!));
}

export function unpaidDone(book: Book) {
  return book.jobs.filter((j) => j.stage === "done" && !j.paid);
}

export function stageCounts(book: Book): Record<Stage, { count: number; total: number }> {
  const out = {} as Record<Stage, { count: number; total: number }>;
  for (const s of ["new", "quoted", "booked", "in_progress", "done", "lost"] as Stage[]) out[s] = { count: 0, total: 0 };
  for (const j of book.jobs) {
    out[j.stage].count++;
    out[j.stage].total += j.quote ?? 0;
  }
  return out;
}

/** Open jobs at the same address + similar room — the "quoted the same kitchen twice" guard. */
export function possibleDuplicateJobs(book: Book, address: string | null, room: string, exceptId?: string): Job[] {
  if (!address) return [];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const addr = norm(address);
  const roomWords = room.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
  return book.jobs.filter((j) => {
    if (j.id === exceptId || !j.address || norm(j.address) !== addr) return false;
    if (!OPEN_STAGES.includes(j.stage)) return false;
    const r = j.room.toLowerCase();
    return roomWords.length === 0 || roomWords.some((w) => r.includes(w));
  });
}

export function possibleDuplicateContacts(
  book: Book,
  input: { name?: string | null; phone?: string | null; email?: string | null },
): Contact[] {
  const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);
  const phone = digits(input.phone);
  const email = (input.email ?? "").trim().toLowerCase();
  const name = (input.name ?? "").trim().toLowerCase();
  return book.contacts.filter(
    (c) =>
      (phone.length >= 7 && digits(c.phone) === phone) ||
      (email && (c.email ?? "").toLowerCase() === email) ||
      (name && c.name.toLowerCase() === name),
  );
}
