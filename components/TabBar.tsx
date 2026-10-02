"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAsk, IconJobs, IconPeople, IconToday } from "./icons";

const TABS = [
  { href: "/", label: "Today", Icon: IconToday, match: (p: string) => p === "/" },
  { href: "/jobs", label: "Jobs", Icon: IconJobs, match: (p: string) => p.startsWith("/jobs") },
  { href: "/people", label: "People", Icon: IconPeople, match: (p: string) => p.startsWith("/people") || p.startsWith("/quiet") || p.startsWith("/import") },
  { href: "/ask", label: "Ask", Icon: IconAsk, match: (p: string) => p.startsWith("/ask") },
];

export function TabBar() {
  const path = usePathname();
  if (path.startsWith("/login")) return null;
  return (
    <div className="tabbar">
      <nav aria-label="Main">
        {TABS.map(({ href, label, Icon, match }) => (
          <Link key={href} href={href} className="tab" aria-current={match(path) ? "page" : undefined}>
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
