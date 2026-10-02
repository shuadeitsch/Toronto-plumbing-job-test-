"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconChevron } from "./icons";

export type PersonItem = { id: string; name: string; sub: string; hay: string; side: string; quiet: boolean };

export function PeopleList({ people }: { people: PersonItem[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return words.length ? people.filter((p) => words.every((w) => p.hay.includes(w))) : people;
  }, [q, people]);
  return (
    <>
      <input
        className="input"
        type="search"
        placeholder={`Search ${people.length} people — name, phone, street`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search people"
      />
      <div className="list mt-12">
        {shown.length === 0 && <div className="empty">No one matches “{q}”.</div>}
        {shown.map((p) => (
          <Link key={p.id} href={`/people/${p.id}`} className="row">
            <div className="row-main">
              <div className="row-title">{p.name}</div>
              <div className="row-sub">{p.sub}</div>
            </div>
            <div className="row-side">{p.quiet ? <span className="pill">{p.side}</span> : <span className="muted">{p.side}</span>}</div>
            <IconChevron className="chev" />
          </Link>
        ))}
      </div>
    </>
  );
}
