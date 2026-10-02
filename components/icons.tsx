// Small stroke icons, drawn to match each other. No icon library.
import type { SVGProps } from "react";

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

type P = SVGProps<SVGSVGElement>;

export const IconToday = (p: P) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M8 14h3" /></svg>
);
export const IconJobs = (p: P) => (
  <svg {...base} {...p}><rect x="4" y="3.5" width="12" height="6" rx="1.5" /><path d="M16 6.5h2.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5H11v2.5" /><rect x="9.5" y="14" width="3" height="7" rx="1" /></svg>
);
export const IconPeople = (p: P) => (
  <svg {...base} {...p}><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M15.5 5.2a3.3 3.3 0 0 1 0 6.6M17.5 14.8c2 .6 3.4 2.3 4 5.2" /></svg>
);
export const IconAsk = (p: P) => (
  <svg {...base} {...p}><path d="M4.5 18.5V7a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3H8.2z" /><path d="M8.5 9h7M8.5 12.5h4.5" /></svg>
);
export const IconPhone = (p: P) => (
  <svg {...base} {...p}><path d="M6.5 3.5h2.7l1.3 4-2 1.3a10.5 10.5 0 0 0 6.7 6.7l1.3-2 4 1.3v2.7a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" /></svg>
);
export const IconText = (p: P) => (
  <svg {...base} {...p}><path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-3.9A8 8 0 1 1 20 12z" /></svg>
);
export const IconMail = (p: P) => (
  <svg {...base} {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
);
export const IconMap = (p: P) => (
  <svg {...base} {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconChevron = (p: P) => (
  <svg {...base} width={16} height={16} {...p}><path d="m9 5 7 7-7 7" /></svg>
);
export const IconBack = (p: P) => (
  <svg {...base} width={18} height={18} {...p}><path d="m15 5-7 7 7 7" /></svg>
);
export const IconSend = (p: P) => (
  <svg {...base} strokeWidth={2} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconCopy = (p: P) => (
  <svg {...base} {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></svg>
);
