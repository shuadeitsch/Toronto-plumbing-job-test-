import Link from "next/link";
import { IconPlus } from "@/components/icons";
import { PeopleList, type PersonItem } from "@/components/PeopleList";
import { Shell } from "@/components/Shell";
import { daysBetween, todayISO } from "@/lib/dates";
import { jobsFor, lastTouch, QUIET_DAYS } from "@/lib/insights";
import { store } from "@/lib/store";
import { OPEN_STAGES, STAGE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function People() {
  const book = await store().load();
  const today = todayISO();
  const items: PersonItem[] = [...book.contacts]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => {
      const jobs = jobsFor(book, c.id);
      const open = jobs.find((j) => OPEN_STAGES.includes(j.stage));
      const days = daysBetween(lastTouch(book, c), today);
      return {
        id: c.id,
        name: c.name,
        sub: open ? `${STAGE_LABEL[open.stage]} · ${open.room}` : c.address?.replace(/, Toronto$/, "") ?? c.phone ?? "",
        hay: [c.name, c.phone?.replace(/\D/g, ""), c.phone, c.email, c.address, ...jobs.map((j) => j.room)].join(" ").toLowerCase(),
        side: days === 0 ? "today" : `${days}d`,
        quiet: days >= QUIET_DAYS,
      };
    });
  const quiet = items.filter((i) => i.quiet).length;

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1 className="title">People</h1>
          <p className="subtitle">Right column: days since you were last in touch.</p>
        </div>
        <Link href="/people/new" className="btn primary sm"><IconPlus /> Add</Link>
      </div>
      <nav className="chips" style={{ marginBottom: 12 }}>
        <Link href="/people" className="chip" aria-current="page">Everyone <span className="n">{items.length}</span></Link>
        <Link href="/quiet" className="chip">Gone quiet <span className="n">{quiet}</span></Link>
        <Link href="/import" className="chip">Import from sheet</Link>
      </nav>
      <PeopleList people={items} />
    </Shell>
  );
}
