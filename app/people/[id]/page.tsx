import Link from "next/link";
import { notFound } from "next/navigation";
import { clearFollowUp, deleteContact, logActivity, setFollowUp } from "@/app/actions";
import { Back, Empty, JobRow, SectionHead } from "@/components/bits";
import { ContactActions } from "@/components/ContactActions";
import { ConfirmButton, QuickNote, Submit } from "@/components/forms";
import { IconPlus } from "@/components/icons";
import { Shell } from "@/components/Shell";
import { Timeline } from "@/components/Timeline";
import { daysBetween, formatDay, relativeDay, todayISO } from "@/lib/dates";
import { activitiesFor, contactById, jobsFor, lastTouch } from "@/lib/insights";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await store().load();
  const contact = contactById(book, id);
  if (!contact) notFound();
  const today = todayISO();
  const jobs = jobsFor(book, id);
  const history = activitiesFor(book, id);
  const touched = lastTouch(book, contact);
  const quietDays = daysBetween(touched, today);
  const rooms = new Map(jobs.map((j) => [j.id, j.room]));

  return (
    <Shell>
      <Back href="/people" label="People" />
      <div className="page-head" style={{ marginTop: 2 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="title">{contact.name}</h1>
          <p className="subtitle">
            {contact.source ? `Found you via ${contact.source.toLowerCase()} · ` : ""}
            last in touch {quietDays === 0 ? "today" : `${quietDays} days ago`}
          </p>
        </div>
      </div>

      <div className="card">
        <ContactActions contact={contact} />
        <dl className="kv mt-16">
          <dt>Phone</dt>
          <dd>{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : <span className="muted">—</span>}</dd>
          <dt>Email</dt>
          <dd>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : <span className="muted">—</span>}</dd>
          <dt>Address</dt>
          <dd>{contact.address ?? <span className="muted">—</span>}</dd>
        </dl>
      </div>

      <section className="section">
        <SectionHead title="Follow-up" />
        <div className="card">
          {contact.follow_up_on && (
            <div className="row-gap" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {formatDay(contact.follow_up_on, { weekday: true })}{" "}
                  <span className={contact.follow_up_on <= today ? "pill warn" : "muted"} style={{ fontWeight: 500 }}>
                    {relativeDay(contact.follow_up_on, today)}
                  </span>
                </div>
                {contact.follow_up_note && <div className="muted" style={{ fontSize: 15 }}>{contact.follow_up_note}</div>}
              </div>
              <form action={clearFollowUp.bind(null, contact.id)}>
                <button className="btn sm" type="submit">Done</button>
              </form>
            </div>
          )}
          <details className="more">
            <summary>{contact.follow_up_on ? "Change date" : "Remind me to follow up…"}</summary>
            <form action={setFollowUp.bind(null, contact.id)} className="form mt-8" style={{ gap: 10 }}>
              <div className="grid-2">
                <input className="input" type="date" name="follow_up_on" required defaultValue={contact.follow_up_on ?? ""} aria-label="Follow-up date" />
                <input className="input" name="follow_up_note" placeholder="Why?" defaultValue={contact.follow_up_note ?? ""} aria-label="Reason" />
              </div>
              <Submit className="btn sm primary">Set reminder</Submit>
            </form>
          </details>
        </div>
      </section>

      <section className="section">
        <SectionHead title="Jobs" count={jobs.length} />
        <div className="list">
          {jobs.length === 0 && <Empty>No jobs yet.</Empty>}
          {jobs.map((j) => (
            <JobRow
              key={j.id}
              job={j}
              contact={contact}
              showName={false}
              sub={`${j.stage === "in_progress" ? "In progress" : j.stage === "new" ? "New lead" : j.stage[0].toUpperCase() + j.stage.slice(1)}${j.wanted_on ? ` · ${formatDay(j.wanted_on)}` : ""}${j.stage === "done" && !j.paid ? " · not paid" : ""}`}
            />
          ))}
        </div>
        <Link href={`/jobs/new?contact=${contact.id}`} className="btn block mt-8"><IconPlus /> New job for {contact.name.split(" ")[0]}</Link>
      </section>

      <section className="section">
        <SectionHead title="History" />
        <div className="card">
          <QuickNote action={logActivity.bind(null, contact.id, null, "note")} />
          <div className="row-gap mt-12">
            <form action={logActivity.bind(null, contact.id, null, "heard_back", undefined)}>
              <button className="btn sm" type="submit">They replied</button>
            </form>
            <form action={logActivity.bind(null, contact.id, null, "reached_out", undefined)}>
              <button className="btn sm" type="submit">I reached out</button>
            </form>
          </div>
          <div className="mt-8">
            <Timeline items={history} jobRooms={rooms} />
          </div>
        </div>
      </section>

      <div className="row-gap mt-24" style={{ justifyContent: "space-between" }}>
        <Link href={`/people/${contact.id}/edit`} className="btn sm">Edit details</Link>
        <ConfirmButton action={deleteContact.bind(null, contact.id)} message={`Delete ${contact.name} and all their jobs? This can't be undone.`}>
          Delete
        </ConfirmButton>
      </div>
    </Shell>
  );
}
