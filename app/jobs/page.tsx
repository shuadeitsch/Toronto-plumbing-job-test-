import Link from "next/link";
import { Empty, JobRow } from "@/components/bits";
import { IconPlus } from "@/components/icons";
import { Shell } from "@/components/Shell";
import { formatDay, formatMoney } from "@/lib/dates";
import { contactById, noReplySinceQuote, stageCounts } from "@/lib/insights";
import { store } from "@/lib/store";
import type { Job, Stage } from "@/lib/types";
import { OPEN_STAGES, STAGES, STAGE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

function sortFor(stage: string) {
  return (a: Job, b: Job) => {
    if (stage === "done" || stage === "lost") return b.stage_changed_at.localeCompare(a.stage_changed_at);
    if (stage === "quoted") return (a.quoted_on ?? "").localeCompare(b.quoted_on ?? "");
    if (stage === "new") return b.created_at.localeCompare(a.created_at);
    return (a.wanted_on ?? "9999").localeCompare(b.wanted_on ?? "9999");
  };
}

export default async function Jobs({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage: raw } = await searchParams;
  const stage = STAGES.includes(raw as Stage) ? (raw as Stage) : "open";
  const book = await store().load();
  const counts = stageCounts(book);
  const openCount = OPEN_STAGES.reduce((s, st) => s + counts[st].count, 0);

  const jobs = book.jobs
    .filter((j) => (stage === "open" ? OPEN_STAGES.includes(j.stage) : j.stage === stage))
    .sort(stage === "open" ? (a, b) => OPEN_STAGES.indexOf(b.stage) - OPEN_STAGES.indexOf(a.stage) || sortFor(a.stage)(a, b) : sortFor(stage));
  const total = jobs.reduce((s, j) => s + (j.quote ?? 0), 0);

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1 className="title">Jobs</h1>
          <p className="subtitle">
            {jobs.length} {stage === "open" ? "open" : STAGE_LABEL[stage].toLowerCase()} · {formatMoney(total)}
          </p>
        </div>
        <Link href="/jobs/new" className="btn primary sm"><IconPlus /> New job</Link>
      </div>

      <nav className="chips" aria-label="Stages">
        <Link href="/jobs" className="chip" aria-current={stage === "open" ? "page" : undefined}>
          All open <span className="n">{openCount}</span>
        </Link>
        {STAGES.map((s) => (
          <Link key={s} href={`/jobs?stage=${s}`} className="chip" aria-current={stage === s ? "page" : undefined}>
            <span className={`dot s-${s}`} style={{ width: 7, height: 7, borderRadius: 99, display: "inline-block" }} />
            {STAGE_LABEL[s]} <span className="n">{counts[s].count}</span>
          </Link>
        ))}
      </nav>

      <div className="list mt-16">
        {jobs.length === 0 && <Empty>No jobs here.</Empty>}
        {jobs.map((j) => {
          const c = contactById(book, j.contact_id);
          const where = j.address?.replace(/, Toronto$/, "");
          let sub: string;
          if (j.stage === "quoted") sub = `Quoted ${formatDay(j.quoted_on)}${noReplySinceQuote(book, j) ? " · no reply yet" : " · replied"}`;
          else if (j.stage === "booked" || j.stage === "in_progress") sub = `${formatDay(j.wanted_on, { weekday: true }) || "No date"} · ${where ?? ""}`;
          else if (j.stage === "done") sub = `${where ?? ""} · ${j.paid ? "Paid" : "Not paid"}`;
          else sub = [where, j.wanted_on && `wants ${formatDay(j.wanted_on)}`].filter(Boolean).join(" · ");
          return (
            <JobRow
              key={j.id}
              job={j}
              contact={c}
              sub={stage === "open" ? `${STAGE_LABEL[j.stage]} · ${sub}` : sub}
            />
          );
        })}
      </div>
    </Shell>
  );
}
