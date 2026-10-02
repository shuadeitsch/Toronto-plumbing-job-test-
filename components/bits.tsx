import Link from "next/link";
import { formatDay, formatMoney, relativeDay } from "@/lib/dates";
import type { Contact, Job, Stage } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/types";
import { IconBack, IconChevron } from "./icons";

export function StagePill({ stage }: { stage: Stage }) {
  return (
    <span className="pill">
      <span className={`dot s-${stage}`} />
      {STAGE_LABEL[stage]}
    </span>
  );
}

export function Back({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="back">
      <IconBack /> {label}
    </Link>
  );
}

export function SectionHead({ title, count, href, link }: { title: string; count?: number; href?: string; link?: string }) {
  return (
    <div className="section-head">
      <h2 className="section-title">
        {title}
        {count != null && <span className="count">{count}</span>}
      </h2>
      {href && link && (
        <Link href={href} className="section-link">
          {link}
        </Link>
      )}
    </div>
  );
}

/** One job, as a tappable row. `side` overrides the right-hand detail. */
export function JobRow({ job, contact, sub, side, showName = true }: { job: Job; contact?: Contact; sub?: string; side?: React.ReactNode; showName?: boolean }) {
  const date = job.wanted_on ? `${formatDay(job.wanted_on, { weekday: true })}` : null;
  return (
    <Link href={`/jobs/${job.id}`} className="row">
      <div className="row-main">
        {showName && <div className="row-title">{contact?.name ?? "Unknown"}</div>}
        <div className={showName ? "row-room" : "row-title"}>{job.room}</div>
        <div className="row-sub">{sub ?? [job.address?.replace(/, Toronto$/, ""), date && `wants ${date}`].filter(Boolean).join(" · ")}</div>
      </div>
      <div className="row-side">
        {side ?? (job.quote != null ? <span className="amt">{formatMoney(job.quote)}</span> : <span className="muted">No quote</span>)}
      </div>
      <IconChevron className="chev" />
    </Link>
  );
}

export function PersonRow({ contact, sub, side }: { contact: Contact; sub?: string; side?: React.ReactNode }) {
  return (
    <Link href={`/people/${contact.id}`} className="row">
      <div className="row-main">
        <div className="row-title">{contact.name}</div>
        <div className="row-sub">{sub ?? contact.address?.replace(/, Toronto$/, "") ?? contact.phone ?? ""}</div>
      </div>
      {side && <div className="row-side">{side}</div>}
      <IconChevron className="chev" />
    </Link>
  );
}

export function When({ date }: { date: string | null }) {
  if (!date) return null;
  return <>{relativeDay(date)}</>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
