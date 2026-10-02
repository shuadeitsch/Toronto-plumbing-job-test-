"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COOKIE, MAX_AGE, sessionToken } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { possibleDuplicateContacts, possibleDuplicateJobs } from "@/lib/insights";
import { store } from "@/lib/store";
import type { ActivityKind, ContactInput, Source, Stage } from "@/lib/types";
import { SOURCES, STAGES, STAGE_LABEL } from "@/lib/types";

const text = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const date = (f: FormData, k: string) => {
  const v = text(f, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
const money = (f: FormData, k: string) => {
  const v = text(f, k);
  if (!v) return null;
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const source = (v: string | null): Source | null => (SOURCES.includes(v as Source) ? (v as Source) : null);

function refresh() {
  revalidatePath("/", "layout");
}

// ---------- session ----------

export async function login(_: { error?: string } | undefined, form: FormData) {
  if (text(form, "passcode") !== process.env.APP_PASSCODE) return { error: "That passcode doesn't match." };
  (await cookies()).set(COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

// ---------- contacts ----------

export type ContactFormState = { error?: string; duplicates?: { id: string; name: string }[] } | undefined;

function contactFromForm(form: FormData): Omit<ContactInput, "follow_up_on" | "follow_up_note"> {
  return {
    name: text(form, "name") ?? "",
    phone: text(form, "phone"),
    email: text(form, "email"),
    address: text(form, "address"),
    source: source(text(form, "source")),
  };
}

export async function createContact(_: ContactFormState, form: FormData): Promise<ContactFormState> {
  const input = contactFromForm(form);
  if (!input.name) return { error: "Add a name." };
  const s = store();
  if (form.get("confirm") !== "1") {
    const dupes = possibleDuplicateContacts(await s.load(), input);
    if (dupes.length) return { duplicates: dupes.map((d) => ({ id: d.id, name: d.name })) };
  }
  const c = await s.createContact({ ...input, follow_up_on: null, follow_up_note: null });
  refresh();
  if (form.get("then") === "job") redirect(`/jobs/new?contact=${c.id}`);
  redirect(`/people/${c.id}`);
}

export async function updateContact(id: string, _: ContactFormState, form: FormData): Promise<ContactFormState> {
  const input = contactFromForm(form);
  if (!input.name) return { error: "Name can't be empty." };
  await store().updateContact(id, input);
  refresh();
  redirect(`/people/${id}`);
}

export async function deleteContact(id: string) {
  await store().deleteContact(id);
  refresh();
  redirect("/people");
}

export async function setFollowUp(contactId: string, form: FormData) {
  const on = date(form, "follow_up_on");
  await store().updateContact(contactId, { follow_up_on: on, follow_up_note: on ? text(form, "follow_up_note") : null });
  refresh();
}

export async function clearFollowUp(contactId: string) {
  await store().updateContact(contactId, { follow_up_on: null, follow_up_note: null });
  refresh();
}

// ---------- history ----------

export async function logActivity(contactId: string, jobId: string | null, kind: ActivityKind, form?: FormData) {
  const fallback = kind === "heard_back" ? "Heard back." : kind === "reached_out" ? "Reached out." : "";
  const body = (form && text(form, "body")) ?? fallback;
  if (!body) return;
  await store().addActivity({ contact_id: contactId, job_id: jobId, kind, body });
  refresh();
}

// ---------- jobs ----------

export type JobFormState = { error?: string; duplicates?: { id: string; room: string; stage: string }[] } | undefined;

export async function createJob(_: JobFormState, form: FormData): Promise<JobFormState> {
  const contactId = text(form, "contact_id");
  const room = text(form, "room");
  if (!contactId) return { error: "Pick who the job is for." };
  if (!room) return { error: "Say what room or area it is." };
  const s = store();
  const book = await s.load();
  const contact = book.contacts.find((c) => c.id === contactId);
  if (!contact) return { error: "That contact no longer exists." };
  const address = text(form, "address") ?? contact.address;
  if (form.get("confirm") !== "1") {
    const dupes = possibleDuplicateJobs(book, address, room);
    if (dupes.length) {
      return { duplicates: dupes.map((d) => ({ id: d.id, room: d.room, stage: STAGE_LABEL[d.stage] })) };
    }
  }
  const quote = money(form, "quote");
  const stageRaw = text(form, "stage") as Stage | null;
  const stage: Stage = stageRaw && STAGES.includes(stageRaw) ? stageRaw : quote != null ? "quoted" : "new";
  const job = await s.createJob({
    contact_id: contactId,
    address,
    room,
    quote,
    quoted_on: date(form, "quoted_on") ?? (stage === "quoted" ? todayISO() : null),
    wanted_on: date(form, "wanted_on"),
    stage,
    notes: text(form, "notes") ?? "",
    paid: false,
  });
  refresh();
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(id: string, _: JobFormState, form: FormData): Promise<JobFormState> {
  const room = text(form, "room");
  if (!room) return { error: "Room can't be empty." };
  await store().updateJob(id, {
    room,
    address: text(form, "address"),
    quote: money(form, "quote"),
    quoted_on: date(form, "quoted_on"),
    wanted_on: date(form, "wanted_on"),
  });
  refresh();
  redirect(`/jobs/${id}`);
}

export async function setStage(id: string, stage: Stage) {
  if (!STAGES.includes(stage)) return;
  const s = store();
  const job = (await s.load()).jobs.find((j) => j.id === id);
  if (!job || job.stage === stage) return;
  await s.updateJob(id, {
    stage,
    ...(stage === "quoted" && !job.quoted_on ? { quoted_on: todayISO() } : {}),
  });
  await s.addActivity({ contact_id: job.contact_id, job_id: id, kind: "stage", body: `Moved to ${STAGE_LABEL[stage]}` });
  refresh();
}

export async function saveJobNotes(id: string, form: FormData) {
  await store().updateJob(id, { notes: text(form, "notes") ?? "" });
  refresh();
}

export async function setPaid(id: string, paid: boolean) {
  await store().updateJob(id, { paid });
  refresh();
}

export async function deleteJob(id: string, contactId: string) {
  await store().deleteJob(id);
  refresh();
  redirect(`/people/${contactId}`);
}

// ---------- import ----------

export async function importContacts(rows: Omit<ContactInput, "follow_up_on" | "follow_up_note">[]) {
  const clean = rows
    .map((r) => ({ ...r, name: r.name?.trim(), source: source(r.source) }))
    .filter((r) => r.name);
  const s = store();
  const book = await s.load();
  // Skip anyone already in the book, and repeats within the paste itself.
  const fresh: typeof clean = [];
  for (const r of clean) {
    if (possibleDuplicateContacts(book, r).length) continue;
    fresh.push(r);
    book.contacts.push({ ...r, id: "", follow_up_on: null, follow_up_note: null, created_at: "" });
  }
  await s.createContacts(fresh.map((r) => ({ ...r, follow_up_on: null, follow_up_note: null })));
  refresh();
  return { added: fresh.length, skipped: clean.length - fresh.length };
}
