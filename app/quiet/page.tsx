import { Back, Empty, PersonRow } from "@/components/bits";
import { Shell } from "@/components/Shell";
import { formatDay } from "@/lib/dates";
import { jobsFor, QUIET_DAYS, quietContacts } from "@/lib/insights";
import { store } from "@/lib/store";
import { STAGE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Quiet() {
  const book = await store().load();
  const quiet = quietContacts(book);
  return (
    <Shell>
      <Back href="/people" label="People" />
      <div className="page-head">
        <div>
          <h1 className="title">Gone quiet</h1>
          <p className="subtitle">No calls, texts or notes in {QUIET_DAYS}+ days. Good people to check in with.</p>
        </div>
      </div>
      <div className="list">
        {quiet.length === 0 && <Empty>Everyone has heard from you this month.</Empty>}
        {quiet.map((q) => {
          const last = jobsFor(book, q.contact.id)[0];
          return (
            <PersonRow
              key={q.contact.id}
              contact={q.contact}
              sub={`Last: ${formatDay(q.lastTouch)}${last ? ` · ${last.room} (${STAGE_LABEL[last.stage]})` : ""}`}
              side={<span className="pill">{q.days} days</span>}
            />
          );
        })}
      </div>
    </Shell>
  );
}
