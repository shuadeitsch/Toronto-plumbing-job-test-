"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ContactFormState, JobFormState } from "@/app/actions";
import type { Contact, Job } from "@/lib/types";
import { SOURCES, STAGES, STAGE_LABEL } from "@/lib/types";

export function Submit({ children, className = "btn primary block", pendingText = "Saving…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

type Action<S> = (state: S, form: FormData) => Promise<S>;

export function ContactForm({ action, contact, submitLabel }: { action: Action<ContactFormState>; contact?: Contact; submitLabel: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="form">
      <div className="field">
        <label htmlFor="name">Name</label>
        <input className="input" id="name" name="name" defaultValue={contact?.name} required autoComplete="off" autoCapitalize="words" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input className="input" id="phone" name="phone" type="tel" inputMode="tel" defaultValue={contact?.phone ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="source">Found me via</label>
          <select className="select" id="source" name="source" defaultValue={contact?.source ?? ""}>
            <option value="">—</option>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" inputMode="email" autoCapitalize="none" defaultValue={contact?.email ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="address">Address</label>
        <input className="input" id="address" name="address" defaultValue={contact?.address ?? ""} autoComplete="street-address" />
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.duplicates && (
        <div className="notice">
          <div>
            Already in your book:{" "}
            {state.duplicates.map((d, i) => (
              <span key={d.id}>{i > 0 && ", "}<Link href={`/people/${d.id}`}>{d.name}</Link></span>
            ))}
            . Add anyway?
          </div>
          <input type="hidden" name="confirm" value="1" />
        </div>
      )}
      <Submit>{state?.duplicates ? "Yes, add as a new person" : submitLabel}</Submit>
      {!contact && (
        <button className="btn block" type="submit" name="then" value="job">
          Save and add a job
        </button>
      )}
    </form>
  );
}

export function JobForm({
  action,
  job,
  contacts,
  contactId,
  submitLabel,
}: {
  action: Action<JobFormState>;
  job?: Job;
  contacts?: Contact[];
  contactId?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [who, setWho] = useState(contactId ?? "");
  const picked = contacts?.find((c) => c.id === who);
  return (
    <form action={formAction} className="form">
      {contacts && (
        <div className="field">
          <label htmlFor="contact_id">Client</label>
          <select className="select" id="contact_id" name="contact_id" value={who} onChange={(e) => setWho(e.target.value)} required>
            <option value="" disabled>Choose…</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="hint">Not in the list? <Link href="/people/new" style={{ color: "var(--accent)" }}>Add a person first</Link></span>
        </div>
      )}
      <div className="field">
        <label htmlFor="room">Room / area</label>
        <input className="input" id="room" name="room" defaultValue={job?.room} placeholder="Kitchen, hallway + stairs…" required autoCapitalize="sentences" />
      </div>
      <div className="field">
        <label htmlFor="address">Job address</label>
        <input className="input" id="address" name="address" defaultValue={job?.address ?? ""} placeholder={picked?.address ?? "Same as client"} key={picked?.id} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="quote">Quote ($)</label>
          <input className="input" id="quote" name="quote" inputMode="decimal" defaultValue={job?.quote ?? ""} placeholder="0" />
        </div>
        <div className="field">
          <label htmlFor="quoted_on">Quoted on</label>
          <input className="input" id="quoted_on" name="quoted_on" type="date" defaultValue={job?.quoted_on ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="wanted_on">Date they want it</label>
        <input className="input" id="wanted_on" name="wanted_on" type="date" defaultValue={job?.wanted_on ?? ""} />
      </div>
      {!job && (
        <>
          <div className="field">
            <label htmlFor="stage">Stage</label>
            <select className="select" id="stage" name="stage" defaultValue="">
              <option value="">Auto (Quoted if there's a quote)</option>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea className="textarea" id="notes" name="notes" placeholder="Colours, prep, access, who decides…" />
          </div>
        </>
      )}
      {state?.error && <p className="error">{state.error}</p>}
      {state?.duplicates && (
        <div className="notice">
          <div>
            There&apos;s already an open job at this address:{" "}
            {state.duplicates.map((d, i) => (
              <span key={d.id}>{i > 0 && ", "}<Link href={`/jobs/${d.id}`}>{d.room} ({d.stage})</Link></span>
            ))}
            . Is this a different job?
          </div>
          <input type="hidden" name="confirm" value="1" />
        </div>
      )}
      <Submit>{state?.duplicates ? "Yes, it's a separate job" : submitLabel}</Submit>
    </form>
  );
}

export function NotesBox({ action, initial }: { action: (form: FormData) => Promise<void>; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = value !== saved;
  return (
    <form
      action={async (f) => {
        await action(f);
        setSaved(String(f.get("notes") ?? ""));
      }}
      className="form"
      style={{ gap: 10 }}
    >
      <textarea
        className="textarea"
        name="notes"
        aria-label="Job notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Colours, prep, access, who decides…"
        style={{ minHeight: 120 }}
      />
      <div className="row-gap">
        <span className="hint">{dirty ? "Unsaved changes" : "Saved"}</span>
        <span className="spacer" />
        <Submit className="btn sm primary" pendingText="Saving…">Save notes</Submit>
      </div>
    </form>
  );
}

export function QuickNote({ action, placeholder = "Add a note…" }: { action: (form: FormData) => Promise<void>; placeholder?: string }) {
  const [key, setKey] = useState(0);
  return (
    <form
      key={key}
      action={async (f) => {
        await action(f);
        setKey((k) => k + 1);
      }}
      className="row-gap"
      style={{ flexWrap: "nowrap" }}
    >
      <input className="input" name="body" placeholder={placeholder} required autoComplete="off" />
      <Submit className="btn sm primary" pendingText="…">Add</Submit>
    </form>
  );
}

export function ConfirmButton({ action, children, message }: { action: () => Promise<void>; children: React.ReactNode; message: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      <button className="btn ghost danger sm" type="submit">{children}</button>
    </form>
  );
}
