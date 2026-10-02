// The tools the "Ask" assistant can use. Every answer it gives has to come from
// one of these — it has no other way to see the book. Read tools return plain
// JSON; write tools change the book and return a receipt the UI shows as a card.
import type Anthropic from "@anthropic-ai/sdk";
import { daysBetween, formatMoney, todayISO, toDateISO } from "../dates";
import {
  activitiesFor,
  bookedWithin,
  contactById,
  followUpsDue,
  jobById,
  jobsFor,
  lastTouch,
  noReplySinceQuote,
  possibleDuplicateContacts,
  quietContacts,
  stageCounts,
  unpaidDone,
  waitingQuotes,
} from "../insights";
import type { Store } from "../store/types";
import type { Book, Contact, Job, Source, Stage } from "../types";
import { SOURCES, STAGES, STAGE_LABEL } from "../types";

export type Card =
  | { type: "draft"; contactId: string; name: string; phone: string | null; body: string }
  | { type: "change"; label: string; detail: string; href: string };

export interface ToolContext {
  store: Store;
  today?: string;
  /** IDs the assistant has actually seen in tool results this turn — used to verify its links. */
  seen: Set<string>;
  cards: Card[];
}

type Input = Record<string, unknown>;

const stageEnum = [...STAGES];
const dateProp = (description: string) => ({ type: "string", description: `${description} (YYYY-MM-DD)` });

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "find_people",
    description:
      "Search contacts by any part of their name, phone, email, street address, or a room on one of their jobs (e.g. 'Davis', 'Priya', 'Glebeholme', 'kitchen'). Always use this before talking about or changing a specific person. Returns an empty list when nobody matches — never guess a person who isn't returned.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Name, phone, address or room words" } },
      required: ["query"],
    },
  },
  {
    name: "get_person",
    description: "Full record for one contact: details, all their jobs, follow-up date, and their recent history (notes, follow-ups, replies).",
    input_schema: {
      type: "object",
      properties: { contact_id: { type: "string" } },
      required: ["contact_id"],
    },
  },
  {
    name: "find_jobs",
    description:
      "List jobs with optional filters. Combine filters freely. Dates are inclusive. Use quoted_from/quoted_to for 'who did I quote last week', wanted_from/wanted_to for scheduling questions.",
    input_schema: {
      type: "object",
      properties: {
        stages: { type: "array", items: { type: "string", enum: stageEnum }, description: "Only these stages" },
        room: { type: "string", description: "Words that must appear in the room, e.g. 'kitchen'" },
        quoted_from: dateProp("Quote sent on or after"),
        quoted_to: dateProp("Quote sent on or before"),
        wanted_from: dateProp("Date wanted/scheduled on or after"),
        wanted_to: dateProp("Date wanted/scheduled on or before"),
        no_reply_since_quote: { type: "boolean", description: "Only jobs where nothing was logged as 'heard back' since the quote went out" },
        unpaid_only: { type: "boolean", description: "Only Done jobs not yet marked paid" },
      },
    },
  },
  {
    name: "quotes_waiting",
    description: "The follow-up reminder list: quotes still in Quoted with no reply logged for at least min_days (default 5) since the quote or Mara's last follow-up.",
    input_schema: {
      type: "object",
      properties: { min_days: { type: "integer", minimum: 0 } },
    },
  },
  {
    name: "quiet_people",
    description: "Contacts with no logged contact of any kind for at least `days` days (default 30).",
    input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1 } } },
  },
  {
    name: "business_summary",
    description: "Counts and dollar totals per stage, unpaid finished jobs, follow-ups due, and the next 14 days of booked work.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "add_note",
    description: "Add a dated note to a contact's history (and optionally to a specific job's notes box). Use for anything Mara wants remembered.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string" },
        text: { type: "string", description: "The note, written the way Mara would jot it" },
        job_id: { type: "string", description: "If the note is about a specific job, also append it to that job's notes box" },
      },
      required: ["contact_id", "text"],
    },
  },
  {
    name: "set_follow_up",
    description: "Set (or clear) the date Mara should next contact this person, with a short reason. It shows up on her Today page that day. Pass date null to clear.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string" },
        date: { type: ["string", "null"], description: "YYYY-MM-DD, or null to clear" },
        reason: { type: "string" },
      },
      required: ["contact_id", "date"],
    },
  },
  {
    name: "log_contact",
    description: "Record that Mara reached out to someone ('reached_out') or that they got back to her ('heard_back'). A 'heard_back' clears the waiting-quote reminder.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string" },
        kind: { type: "string", enum: ["reached_out", "heard_back"] },
        summary: { type: "string", description: "One line on what was said" },
        job_id: { type: "string" },
      },
      required: ["contact_id", "kind"],
    },
  },
  {
    name: "update_job",
    description:
      "Change a job: move it to another stage, change the quote, the date wanted, the room description, mark it paid. Setting stage to 'quoted' with a quote stamps today's date as the quote date unless quoted_on is given.",
    input_schema: {
      type: "object",
      properties: {
        job_id: { type: "string" },
        stage: { type: "string", enum: stageEnum },
        quote: { type: "number", description: "Dollars, before tax" },
        quoted_on: dateProp("Date the quote was sent"),
        wanted_on: dateProp("Date the client wants it / scheduled date"),
        room: { type: "string" },
        paid: { type: "boolean" },
      },
      required: ["job_id"],
    },
  },
  {
    name: "add_lead",
    description:
      "Create a new contact with a New lead job. Only when Mara explicitly asks to add someone new. If a matching person already exists it refuses and returns them — then ask Mara before retrying with allow_duplicate.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        source: { type: "string", enum: [...SOURCES] },
        room: { type: "string", description: "What they want painted" },
        wanted_on: dateProp("When they want it"),
        note: { type: "string" },
        allow_duplicate: { type: "boolean" },
      },
      required: ["name"],
    },
  },
  {
    name: "prepare_text",
    description:
      "Put a ready-to-send text message on screen for Mara with buttons to copy it or open it in her Messages app. It is NOT sent. Use this whenever she asks you to draft or write a text to a client.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string" },
        message: { type: "string", description: "The text, written in Mara's voice, signed '– Mara'" },
      },
      required: ["contact_id", "message"],
    },
  },
];

// ---------- helpers ----------

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function jobSummary(book: Book, j: Job, today: string, ctx: ToolContext) {
  ctx.seen.add(j.id);
  ctx.seen.add(j.contact_id);
  const c = contactById(book, j.contact_id);
  return {
    job_id: j.id,
    contact_id: j.contact_id,
    client: c?.name ?? "(missing contact)",
    room: j.room,
    address: j.address,
    stage: STAGE_LABEL[j.stage],
    quote: j.quote,
    quoted_on: j.quoted_on,
    days_since_quote: j.quoted_on ? daysBetween(j.quoted_on, today) : null,
    no_reply_since_quote: j.quoted_on ? noReplySinceQuote(book, j) : null,
    wanted_on: j.wanted_on,
    paid: j.stage === "done" ? j.paid : undefined,
    notes: j.notes || undefined,
  };
}

function personSummary(book: Book, c: Contact, ctx: ToolContext) {
  ctx.seen.add(c.id);
  return {
    contact_id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    last_contact: lastTouch(book, c),
    jobs: jobsFor(book, c.id).map((j) => {
      ctx.seen.add(j.id);
      return `${j.room} — ${STAGE_LABEL[j.stage]}${j.quote != null ? `, ${formatMoney(j.quote)}` : ""} (job_id ${j.id})`;
    }),
  };
}

function requireContact(book: Book, id: unknown): Contact {
  const c = typeof id === "string" ? contactById(book, id) : undefined;
  if (!c) throw new ToolError("No contact with that contact_id. Use find_people to get a real id.");
  return c;
}

function requireJob(book: Book, id: unknown): Job {
  const j = typeof id === "string" ? jobById(book, id) : undefined;
  if (!j) throw new ToolError("No job with that job_id. Use find_jobs or get_person to get a real id.");
  return j;
}

export class ToolError extends Error {}

const STOPWORDS = new Set(["the", "and", "of", "on", "at", "for", "job", "jobs", "house", "place", "mr", "mrs", "ms"]);

function matches(book: Book, c: Contact, q: string): boolean {
  const tokens = q
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9@.]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  if (tokens.length === 0) return false;
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 4 && (c.phone ?? "").replace(/\D/g, "").includes(digits)) return true;
  const hay = [c.name, c.email, c.address, ...jobsFor(book, c.id).map((j) => `${j.room} ${j.address ?? ""}`)]
    .join(" ")
    .toLowerCase();
  // Every word must match somewhere ("davis kitchen" → the Davises, via their kitchen job).
  return tokens.every((t) => hay.includes(t));
}

// ---------- executor ----------

export async function runTool(name: string, input: Input, ctx: ToolContext): Promise<unknown> {
  const today = ctx.today ?? todayISO();
  const book = await ctx.store.load();

  switch (name) {
    case "find_people": {
      const q = str(input.query) ?? "";
      let found = book.contacts.filter((c) => matches(book, c, q));
      // Fall back to any-word match so "Davis kitchen" still finds "Tom & Leah Davis".
      if (found.length === 0) {
        const words = q.split(/\s+/).filter((w) => w.length > 2);
        found = book.contacts.filter((c) => words.some((w) => matches(book, c, w)));
      }
      return { query: q, matches: found.slice(0, 10).map((c) => personSummary(book, c, ctx)), count: found.length };
    }

    case "get_person": {
      const c = requireContact(book, input.contact_id);
      ctx.seen.add(c.id);
      return {
        contact_id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        found_via: c.source,
        added_on: toDateISO(c.created_at),
        last_contact: lastTouch(book, c),
        follow_up_on: c.follow_up_on,
        follow_up_reason: c.follow_up_note,
        jobs: jobsFor(book, c.id).map((j) => jobSummary(book, j, today, ctx)),
        history: activitiesFor(book, c.id)
          .slice(0, 25)
          .map((a) => ({ date: toDateISO(a.created_at), type: a.kind, text: a.body, job_id: a.job_id })),
      };
    }

    case "find_jobs": {
      let jobs = book.jobs;
      const stages = Array.isArray(input.stages) ? (input.stages as string[]).filter((s) => STAGES.includes(s as Stage)) : [];
      if (stages.length) jobs = jobs.filter((j) => stages.includes(j.stage));
      const room = str(input.room)?.toLowerCase();
      if (room) jobs = jobs.filter((j) => room.split(/\s+/).every((w) => j.room.toLowerCase().includes(w)));
      if (isDate(input.quoted_from)) jobs = jobs.filter((j) => j.quoted_on && j.quoted_on >= input.quoted_from!);
      if (isDate(input.quoted_to)) jobs = jobs.filter((j) => j.quoted_on && j.quoted_on <= input.quoted_to!);
      if (isDate(input.wanted_from)) jobs = jobs.filter((j) => j.wanted_on && j.wanted_on >= input.wanted_from!);
      if (isDate(input.wanted_to)) jobs = jobs.filter((j) => j.wanted_on && j.wanted_on <= input.wanted_to!);
      if (input.no_reply_since_quote === true) jobs = jobs.filter((j) => noReplySinceQuote(book, j));
      if (input.unpaid_only === true) jobs = jobs.filter((j) => j.stage === "done" && !j.paid);
      const sorted = [...jobs].sort((a, b) => (a.wanted_on ?? "9999").localeCompare(b.wanted_on ?? "9999"));
      return { count: sorted.length, jobs: sorted.slice(0, 50).map((j) => jobSummary(book, j, today, ctx)) };
    }

    case "quotes_waiting": {
      const min = typeof input.min_days === "number" ? input.min_days : 5;
      const list = waitingQuotes(book, min, today);
      return {
        rule: `In Quoted, nothing logged as 'heard back' since the quote, and ${min}+ days since the quote or Mara's last follow-up.`,
        count: list.length,
        quotes: list.map((w) => ({
          ...jobSummary(book, w.job, today, ctx),
          phone: w.contact.phone,
          last_follow_up: w.lastFollowUp,
          days_waiting: w.daysSinceNudge,
        })),
      };
    }

    case "quiet_people": {
      const days = typeof input.days === "number" ? input.days : 30;
      const list = quietContacts(book, days, today);
      return {
        count: list.length,
        people: list.map((q) => ({
          ...personSummary(book, q.contact, ctx),
          days_quiet: q.days,
        })),
      };
    }

    case "business_summary": {
      const counts = stageCounts(book);
      const unpaid = unpaidDone(book);
      return {
        today,
        stages: Object.fromEntries(STAGES.map((s) => [STAGE_LABEL[s], counts[s]])),
        unpaid_done_jobs: unpaid.map((j) => jobSummary(book, j, today, ctx)),
        unpaid_total: unpaid.reduce((s, j) => s + (j.quote ?? 0), 0),
        follow_ups_due: followUpsDue(book, today).map((c) => ({
          ...personSummary(book, c, ctx),
          follow_up_on: c.follow_up_on,
          reason: c.follow_up_note,
        })),
        booked_next_14_days: bookedWithin(book, 14, today).map((j) => jobSummary(book, j, today, ctx)),
        quotes_waiting: waitingQuotes(book, 5, today).length,
      };
    }

    case "add_note": {
      const c = requireContact(book, input.contact_id);
      const text = str(input.text);
      if (!text) throw new ToolError("Note text is empty.");
      let job: Job | undefined;
      if (input.job_id) {
        job = requireJob(book, input.job_id);
        if (job.contact_id !== c.id) throw new ToolError("That job belongs to a different contact.");
        const stamp = `${today}: ${text}`;
        await ctx.store.updateJob(job.id, { notes: job.notes ? `${job.notes}\n${stamp}` : stamp });
      }
      await ctx.store.addActivity({ contact_id: c.id, job_id: job?.id ?? null, kind: "note", body: text });
      ctx.seen.add(c.id);
      ctx.cards.push({
        type: "change",
        label: `Note added to ${c.name}`,
        detail: text,
        href: job ? `/jobs/${job.id}` : `/people/${c.id}`,
      });
      return { ok: true, saved_to: job ? `${c.name}'s history and the ${job.room} job notes` : `${c.name}'s history` };
    }

    case "set_follow_up": {
      const c = requireContact(book, input.contact_id);
      const date = input.date === null ? null : isDate(input.date) ? input.date : undefined;
      if (date === undefined) throw new ToolError("date must be YYYY-MM-DD or null.");
      const reason = str(input.reason) ?? null;
      await ctx.store.updateContact(c.id, { follow_up_on: date, follow_up_note: date ? reason : null });
      ctx.seen.add(c.id);
      ctx.cards.push({
        type: "change",
        label: date ? `Follow-up set for ${c.name}` : `Follow-up cleared for ${c.name}`,
        detail: date ? `${date}${reason ? ` — ${reason}` : ""}` : "",
        href: `/people/${c.id}`,
      });
      return { ok: true, follow_up_on: date };
    }

    case "log_contact": {
      const c = requireContact(book, input.contact_id);
      const kind = input.kind === "heard_back" ? "heard_back" : input.kind === "reached_out" ? "reached_out" : null;
      if (!kind) throw new ToolError("kind must be reached_out or heard_back.");
      const job = input.job_id ? requireJob(book, input.job_id) : undefined;
      const summary = str(input.summary) ?? (kind === "heard_back" ? "Heard back." : "Reached out.");
      await ctx.store.addActivity({ contact_id: c.id, job_id: job?.id ?? null, kind, body: summary });
      ctx.seen.add(c.id);
      ctx.cards.push({
        type: "change",
        label: kind === "heard_back" ? `Logged reply from ${c.name}` : `Logged follow-up with ${c.name}`,
        detail: summary,
        href: `/people/${c.id}`,
      });
      return { ok: true };
    }

    case "update_job": {
      const j = requireJob(book, input.job_id);
      const patch: Partial<Job> = {};
      const changes: string[] = [];
      if (typeof input.stage === "string" && STAGES.includes(input.stage as Stage) && input.stage !== j.stage) {
        patch.stage = input.stage as Stage;
        changes.push(`${STAGE_LABEL[j.stage]} → ${STAGE_LABEL[patch.stage]}`);
        if (patch.stage === "quoted" && !j.quoted_on && !isDate(input.quoted_on)) patch.quoted_on = today;
      }
      if (typeof input.quote === "number" && input.quote >= 0) {
        patch.quote = input.quote;
        changes.push(`quote ${formatMoney(input.quote)}`);
      }
      if (isDate(input.quoted_on)) {
        patch.quoted_on = input.quoted_on;
        changes.push(`quoted on ${input.quoted_on}`);
      }
      if (isDate(input.wanted_on)) {
        patch.wanted_on = input.wanted_on;
        changes.push(`date ${input.wanted_on}`);
      }
      if (str(input.room)) {
        patch.room = str(input.room)!;
        changes.push(`room "${patch.room}"`);
      }
      if (typeof input.paid === "boolean") {
        patch.paid = input.paid;
        changes.push(input.paid ? "marked paid" : "marked unpaid");
      }
      if (changes.length === 0) throw new ToolError("Nothing to change.");
      await ctx.store.updateJob(j.id, patch);
      if (patch.stage) {
        await ctx.store.addActivity({ contact_id: j.contact_id, job_id: j.id, kind: "stage", body: `Moved to ${STAGE_LABEL[patch.stage]}` });
      }
      const c = contactById(book, j.contact_id);
      ctx.seen.add(j.id);
      ctx.cards.push({ type: "change", label: `Updated ${c?.name ?? "job"} — ${j.room}`, detail: changes.join(", "), href: `/jobs/${j.id}` });
      return { ok: true, changed: changes };
    }

    case "add_lead": {
      const name = str(input.name);
      if (!name) throw new ToolError("Name is required.");
      const dupes = possibleDuplicateContacts(book, { name, phone: str(input.phone), email: str(input.email) });
      if (dupes.length && input.allow_duplicate !== true) {
        return {
          ok: false,
          reason: "Looks like this person may already be in the book. Ask Mara whether to use the existing contact.",
          existing: dupes.map((c) => personSummary(book, c, ctx)),
        };
      }
      const source = SOURCES.includes(input.source as Source) ? (input.source as Source) : null;
      const contact = await ctx.store.createContact({
        name,
        phone: str(input.phone) ?? null,
        email: str(input.email) ?? null,
        address: str(input.address) ?? null,
        source,
        follow_up_on: null,
        follow_up_note: null,
      });
      const job = await ctx.store.createJob({
        contact_id: contact.id,
        address: contact.address,
        room: str(input.room) ?? "Not sure yet",
        quote: null,
        quoted_on: null,
        wanted_on: isDate(input.wanted_on) ? input.wanted_on : null,
        stage: "new",
        notes: str(input.note) ?? "",
        paid: false,
      });
      await ctx.store.addActivity({ contact_id: contact.id, job_id: job.id, kind: "note", body: str(input.note) ?? "Added as a new lead." });
      ctx.seen.add(contact.id);
      ctx.seen.add(job.id);
      ctx.cards.push({ type: "change", label: `New lead: ${name}`, detail: job.room, href: `/jobs/${job.id}` });
      return { ok: true, contact_id: contact.id, job_id: job.id };
    }

    case "prepare_text": {
      const c = requireContact(book, input.contact_id);
      const message = str(input.message);
      if (!message) throw new ToolError("Message is empty.");
      ctx.seen.add(c.id);
      ctx.cards.push({ type: "draft", contactId: c.id, name: c.name, phone: c.phone, body: message });
      return { ok: true, shown_to_mara: true, phone_on_file: Boolean(c.phone) };
    }

    default:
      throw new ToolError(`Unknown tool ${name}`);
  }
}

export const TOOL_STATUS: Record<string, (input: Input) => string> = {
  find_people: (i) => `Looking up “${String(i.query ?? "")}”`,
  get_person: () => "Reading their file",
  find_jobs: () => "Going through jobs",
  quotes_waiting: () => "Checking quotes waiting on a reply",
  quiet_people: () => "Checking who’s gone quiet",
  business_summary: () => "Pulling the overview",
  add_note: () => "Saving the note",
  set_follow_up: () => "Setting a follow-up",
  log_contact: () => "Logging it",
  update_job: () => "Updating the job",
  add_lead: () => "Adding the lead",
  prepare_text: () => "Drafting the text",
};
