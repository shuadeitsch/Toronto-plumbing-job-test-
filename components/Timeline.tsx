import { formatDay, toDateISO } from "@/lib/dates";
import type { Activity } from "@/lib/types";
import { ACTIVITY_LABEL } from "@/lib/types";

export function Timeline({ items, jobRooms }: { items: Activity[]; jobRooms?: Map<string, string> }) {
  if (items.length === 0) return <div className="empty">Nothing logged yet.</div>;
  return (
    <ul className="timeline">
      {items.map((a) => (
        <li key={a.id}>
          <time dateTime={a.created_at}>{formatDay(toDateISO(a.created_at))}</time>
          <div>
            <span className={`k ${a.kind}`}>
              {ACTIVITY_LABEL[a.kind]}
              {a.job_id && jobRooms?.get(a.job_id) ? ` · ${jobRooms.get(a.job_id)}` : ""}
            </span>
            {a.kind === "stage" ? <span className="muted">{a.body}</span> : a.body}
          </div>
        </li>
      ))}
    </ul>
  );
}
