import Link from "next/link";
import { Empty, JobRow, PersonRow, SectionHead } from "@/components/bits";
import { IconSend } from "@/components/icons";
import { Shell } from "@/components/Shell";
import { formatDay, formatMoney, relativeDay, todayISO } from "@/lib/dates";
import {
  bookedWithin,
  contactById,
  followUpsDue,
  quietContacts,
  QUIET_DAYS,
  QUOTE_NUDGE_DAYS,
  unpaidDone,
  upcomingFollowUps,
  waitingQuotes,
} from "@/lib/insights";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Today() {
  const book = await store().load();
  const today = todayISO();
  const waiting = waitingQuotes(book);
  const due = followUpsDue(book);
  const soon = upcomingFollowUps(book, 7);
  const booked = bookedWithin(book, 14);
  const inProgress = book.jobs.filter((j) => j.stage === "in_progress");
  const unpaid = unpaidDone(book);
  const quiet = quietContacts(book);
  const pipeline = book.jobs.filter((j) => j.stage === "quoted" || j.stage === "booked").reduce((s, j) => s + (j.quote ?? 0), 0);
  const owed = unpaid.reduce((s, j) => s + (j.quote ?? 0), 0);
  const name = (id: string) => contactById(book, id);

  const dateTitle = new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Toronto" });

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1 className="title">{dateTitle}</h1>
          <p className="subtitle">
            {waiting.length + due.length === 0
              ? "Nothing needs chasing today."
              : `${waiting.length + due.length} ${waiting.length + due.length === 1 ? "person needs" : "people need"} a nudge today.`}
          </p>
        </div>
      </div>

      <form action="/ask" className="askbar">
        <label htmlFor="q" className="sr">Ask your book</label>
        <input id="q" name="q" placeholder="Ask your book anything…" autoComplete="off" enterKeyHint="send" />
        <button className="send" type="submit" aria-label="Ask"><IconSend /></button>
      </form>

      <div className="stats mt-16">
        <Link href="/jobs?stage=quoted" className="stat">
          <div className="stat-n">{formatMoney(pipeline)}</div>
          <div className="stat-l">Quoted + booked</div>
        </Link>
        <Link href="/jobs?stage=booked" className="stat">
          <div className="stat-n">{booked.length}</div>
          <div className="stat-l">Jobs in next 14 days</div>
        </Link>
        <Link href="/jobs?stage=done" className={`stat${owed > 0 ? " alert" : ""}`}>
          <div className="stat-n">{formatMoney(owed)}</div>
          <div className="stat-l">Done, not paid</div>
        </Link>
      </div>

      <section className="section">
        <SectionHead title="Quotes with no reply" count={waiting.length} />
        <div className="list">
          {waiting.length === 0 && <Empty>No quote has sat {QUOTE_NUDGE_DAYS}+ days without a reply.</Empty>}
          {waiting.map((w) => (
            <JobRow
              key={w.job.id}
              job={w.job}
              contact={w.contact}
              sub={`${formatMoney(w.job.quote)} · quoted ${formatDay(w.job.quoted_on)}`}
              side={<span className="pill warn">{w.daysSinceNudge} days</span>}
            />
          ))}
        </div>
      </section>

      {(due.length > 0 || soon.length > 0) && (
        <section className="section">
          <SectionHead title="Follow-ups" count={due.length} />
          <div className="list">
            {due.map((c) => (
              <PersonRow
                key={c.id}
                contact={c}
                sub={c.follow_up_note ?? "Follow up"}
                side={<span className={`pill ${c.follow_up_on! < today ? "bad" : "warn"}`}>{c.follow_up_on === today ? "Today" : relativeDay(c.follow_up_on)}</span>}
              />
            ))}
            {soon.map((c) => (
              <PersonRow key={c.id} contact={c} sub={c.follow_up_note ?? "Follow up"} side={<span className="muted">{formatDay(c.follow_up_on, { weekday: true })}</span>} />
            ))}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="section">
          <SectionHead title="On the go" count={inProgress.length} />
          <div className="list">
            {inProgress.map((j) => <JobRow key={j.id} job={j} contact={name(j.contact_id)} />)}
          </div>
        </section>
      )}

      <section className="section">
        <SectionHead title="Booked · next 14 days" count={booked.length} href="/jobs?stage=booked" link="All booked" />
        <div className="list">
          {booked.length === 0 && <Empty>Nothing booked in the next two weeks.</Empty>}
          {booked.map((j) => (
            <JobRow
              key={j.id}
              job={j}
              contact={name(j.contact_id)}
              sub={`${formatDay(j.wanted_on, { weekday: true })} · ${relativeDay(j.wanted_on)}`}
            />
          ))}
        </div>
      </section>

      {unpaid.length > 0 && (
        <section className="section">
          <SectionHead title="Waiting on payment" count={unpaid.length} />
          <div className="list">
            {unpaid.map((j) => (
              <JobRow key={j.id} job={j} contact={name(j.contact_id)} sub={`Finished ${relativeDay(j.wanted_on) || ""}`.trim()} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <Link href="/quiet" className="list row">
          <div className="row-main">
            <div className="row-title">Gone quiet</div>
            <div className="row-sub">No contact in {QUIET_DAYS}+ days</div>
          </div>
          <div className="row-side"><span className="amt">{quiet.length}</span></div>
        </Link>
      </section>
    </Shell>
  );
}
