import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteJob, logActivity, saveJobNotes, setPaid, setStage } from "@/app/actions";
import { Back, SectionHead, StagePill } from "@/components/bits";
import { ContactActions } from "@/components/ContactActions";
import { ConfirmButton, NotesBox, QuickNote } from "@/components/forms";
import { Shell } from "@/components/Shell";
import { Timeline } from "@/components/Timeline";
import { daysBetween, formatDay, formatMoney, relativeDay, todayISO } from "@/lib/dates";
import { contactById, jobById, noReplySinceQuote, QUOTE_NUDGE_DAYS, waitingQuotes } from "@/lib/insights";
import { store } from "@/lib/store";
import { STAGES, STAGE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await store().load();
  const job = jobById(book, id);
  if (!job) notFound();
  const contact = contactById(book, job.contact_id)!;
  const history = book.activities.filter((a) => a.job_id === job.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const waiting = waitingQuotes(book).find((w) => w.job.id === job.id);
  const today = todayISO();

  return (
    <Shell>
      <Back href="/jobs" label="Jobs" />
      <div className="page-head" style={{ marginTop: 2 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="title">{job.room}</h1>
          <p className="subtitle">
            <Link href={`/people/${contact.id}`} style={{ color: "var(--accent)" }}>{contact.name}</Link>
            {job.address && ` · ${job.address.replace(/, Toronto$/, "")}`}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="row-gap" style={{ justifyContent: "space-between" }}>
          <div className="big-amt">{job.quote != null ? formatMoney(job.quote) : <span className="muted" style={{ fontSize: 20 }}>No quote yet</span>}</div>
          <StagePill stage={job.stage} />
        </div>
        <dl className="kv mt-12">
          <dt>Date wanted</dt>
          <dd>{job.wanted_on ? <>{formatDay(job.wanted_on, { weekday: true })} <span className="muted">· {relativeDay(job.wanted_on, today)}</span></> : <span className="muted">Not set</span>}</dd>
          {job.quoted_on && (
            <>
              <dt>Quoted</dt>
              <dd>
                {formatDay(job.quoted_on)} <span className="muted">· {daysBetween(job.quoted_on, today)} days ago</span>
                {job.stage === "quoted" && (noReplySinceQuote(book, job) ? <span className="muted"> · no reply yet</span> : <span className="muted"> · replied</span>)}
              </dd>
            </>
          )}
          {job.stage === "done" && (
            <>
              <dt>Payment</dt>
              <dd className="row-gap">
                {job.paid ? <span className="pill good">Paid</span> : <span className="pill warn">Not paid</span>}
                <form action={setPaid.bind(null, job.id, !job.paid)}>
                  <button className="btn ghost sm" type="submit">{job.paid ? "Mark unpaid" : "Mark paid"}</button>
                </form>
              </dd>
            </>
          )}
        </dl>
        <div className="mt-16">
          <ContactActions contact={contact} address={job.address} />
        </div>
      </div>

      {waiting && (
        <div className="notice mt-12">
          <div>
            No reply in {waiting.daysSinceNudge} days{waiting.lastFollowUp ? " since your last nudge" : ""}. Reminders start after {QUOTE_NUDGE_DAYS} days.
          </div>
          <div className="row-gap">
            <form action={logActivity.bind(null, contact.id, job.id, "heard_back", undefined)}>
              <button className="btn sm" type="submit">They replied</button>
            </form>
            <form action={logActivity.bind(null, contact.id, job.id, "reached_out", undefined)}>
              <button className="btn sm" type="submit">I followed up</button>
            </form>
            <Link className="btn sm" href={`/ask?q=${encodeURIComponent(`Draft a short follow-up text to ${contact.name} about the ${job.room} quote. Polite, not salesy.`)}`}>Draft a text</Link>
          </div>
        </div>
      )}

      <section className="section">
        <SectionHead title="Stage" />
        <form className="stage-picker">
          {STAGES.map((s) => (
            <button key={s} formAction={setStage.bind(null, job.id, s)} aria-pressed={job.stage === s}>
              {STAGE_LABEL[s]}
            </button>
          ))}
        </form>
      </section>

      <section className="section">
        <SectionHead title="Notes" />
        <NotesBox action={saveJobNotes.bind(null, job.id)} initial={job.notes} />
      </section>

      <section className="section">
        <SectionHead title="History" />
        <div className="card">
          <QuickNote action={logActivity.bind(null, contact.id, job.id, "note")} placeholder="Log a call, a reply, anything…" />
          {!waiting && job.stage !== "done" && job.stage !== "lost" && (
            <div className="row-gap mt-12">
              <form action={logActivity.bind(null, contact.id, job.id, "heard_back", undefined)}>
                <button className="btn sm" type="submit">They replied</button>
              </form>
              <form action={logActivity.bind(null, contact.id, job.id, "reached_out", undefined)}>
                <button className="btn sm" type="submit">I reached out</button>
              </form>
            </div>
          )}
          <div className="mt-8">
            <Timeline items={history} />
          </div>
        </div>
      </section>

      <div className="row-gap mt-24" style={{ justifyContent: "space-between" }}>
        <Link href={`/jobs/${job.id}/edit`} className="btn sm">Edit details</Link>
        <ConfirmButton action={deleteJob.bind(null, job.id, contact.id)} message="Delete this job? This can't be undone.">Delete job</ConfirmButton>
      </div>
    </Shell>
  );
}
