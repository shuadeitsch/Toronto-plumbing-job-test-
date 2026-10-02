// Turns a paste from Google Sheets (tab-separated) or a CSV file into contacts.
// Column names are matched loosely so "Phone #", "Cell", "How found" all work.
import type { Source } from "./types";

export type ImportRow = { name: string; phone: string | null; email: string | null; address: string | null; source: Source | null };

const FIELDS: [keyof ImportRow, RegExp][] = [
  ["name", /^(full\s*)?name|client|customer|contact$/i],
  ["phone", /phone|cell|mobile|tel/i],
  ["email", /e-?mail/i],
  ["address", /address|street|location/i],
  ["source", /source|how|found|referr|lead/i],
];

export function splitRows(text: string): string[][] {
  const delim = text.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

export function normalizeSource(v: string): Source | null {
  const s = v.toLowerCase();
  if (!s) return null;
  if (s.includes("insta") || s === "ig") return "Instagram";
  if (s.includes("neigh")) return "Neighbor";
  if (s.includes("repeat") || s.includes("past") || s.includes("return")) return "Repeat";
  if (s.includes("refer") || s.includes("friend") || s.includes("word")) return "Referral";
  return "Other";
}

export function parseContacts(text: string): { rows: ImportRow[]; mapped: Partial<Record<keyof ImportRow, string>> } {
  const table = splitRows(text);
  if (table.length === 0) return { rows: [], mapped: {} };
  const header = table[0];
  const index: Partial<Record<keyof ImportRow, number>> = {};
  const mapped: Partial<Record<keyof ImportRow, string>> = {};
  header.forEach((h, i) => {
    for (const [field, re] of FIELDS) {
      if (index[field] == null && re.test(h)) {
        index[field] = i;
        mapped[field] = h;
        break;
      }
    }
  });
  const hasHeader = index.name != null;
  // No recognisable header: assume Name, Phone, Email, Address, Source.
  const order: (keyof ImportRow)[] = ["name", "phone", "email", "address", "source"];
  const col = (r: string[], f: keyof ImportRow) => (hasHeader ? (index[f] != null ? r[index[f]!] : "") : r[order.indexOf(f)]) ?? "";
  const rows = (hasHeader ? table.slice(1) : table)
    .map((r) => ({
      name: col(r, "name"),
      phone: col(r, "phone") || null,
      email: col(r, "email") || null,
      address: col(r, "address") || null,
      source: normalizeSource(col(r, "source")),
    }))
    .filter((r) => r.name);
  return { rows, mapped: hasHeader ? mapped : {} };
}
