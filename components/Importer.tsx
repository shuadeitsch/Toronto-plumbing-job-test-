"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { importContacts } from "@/app/actions";
import { parseContacts } from "@/lib/importer";

export function Importer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [pending, start] = useTransition();
  const { rows, mapped } = parseContacts(text);

  return (
    <div className="form">
      <div className="field">
        <label htmlFor="paste">Paste from Google Sheets</label>
        <textarea
          id="paste"
          className="textarea"
          style={{ minHeight: 140, fontSize: 14 }}
          placeholder={"Name\tPhone\tEmail\tAddress\tHow found\nJane Doe\t416-555-0100\tjane@…\t12 Main St\tInstagram"}
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
        />
        <span className="hint">Select the cells in your sheet (including the header row), copy, and paste here. A .csv file works too:</span>
        <input
          type="file"
          accept=".csv,text/csv,.tsv,text/tab-separated-values"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) { setText(await f.text()); setResult(null); }
          }}
        />
      </div>

      {rows.length > 0 && (
        <>
          <div className="hint">
            {rows.length} {rows.length === 1 ? "person" : "people"} found.
            {Object.keys(mapped).length > 0 && ` Columns used: ${Object.entries(mapped).map(([k, v]) => `${v} → ${k}`).join(", ")}.`}
          </div>
          <div className="table-wrap">
            <table className="preview">
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Found via</th></tr></thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}><td>{r.name}</td><td>{r.phone}</td><td>{r.email}</td><td>{r.address}</td><td>{r.source}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn primary block"
            disabled={pending}
            onClick={() => start(async () => setResult(await importContacts(rows)))}
          >
            {pending ? "Importing…" : `Import ${rows.length} ${rows.length === 1 ? "person" : "people"}`}
          </button>
        </>
      )}

      {result && (
        <div className="notice" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          <div>
            Added {result.added}. {result.skipped > 0 && `Skipped ${result.skipped} already in the book (same name, phone or email). `}
            <Link href="/people">See everyone</Link>
          </div>
        </div>
      )}
    </div>
  );
}
