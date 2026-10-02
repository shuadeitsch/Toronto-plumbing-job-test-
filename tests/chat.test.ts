import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { runChat, verifyLinks, type ChatEvent } from "../lib/chat/agent";
import { runTool, ToolError, type ToolContext } from "../lib/chat/tools";
import { parseContacts } from "../lib/importer";
import { quietContacts, waitingQuotes } from "../lib/insights";
import { buildSeedBook } from "../lib/seed";
import { createMemoryStore } from "../lib/store/memory";
import type { Book } from "../lib/types";

// A fixed Friday, so "last week" is Mon Sep 21 – Sun Sep 27.
const TODAY = "2026-10-02";
let book: Book;
let ctx: ToolContext;
const run = (name: string, input: Record<string, unknown> = {}) => runTool(name, input, ctx) as Promise<any>;
const names = (rows: { client?: string; name?: string }[]) => rows.map((r) => r.client ?? r.name).sort();

beforeEach(() => {
  book = buildSeedBook(TODAY);
  ctx = { store: createMemoryStore(() => book), today: TODAY, seen: new Set(), cards: [] };
});

describe("reminders", () => {
  test("quotes waiting 5+ days with no reply", () => {
    const list = waitingQuotes(book, 5, TODAY).map((w) => w.contact.name).sort();
    assert.deepEqual(list, ["Angela Romano", "Nadia Haddad", "Tom & Leah Davis"]);
  });

  test("a reply clears the reminder", async () => {
    const davis = book.contacts.find((c) => c.name.includes("Davis"))!;
    await run("log_contact", { contact_id: davis.id, kind: "heard_back", summary: "Wants to talk Saturday" });
    assert.ok(!waitingQuotes(book, 5, TODAY).some((w) => w.contact.id === davis.id));
  });

  test("gone quiet 30+ days", () => {
    assert.deepEqual(quietContacts(book, 30, TODAY).map((q) => q.contact.name).sort(), ["James Whitfield", "Owen Price", "Sofia Mendes"]);
  });
});

describe("the four test questions (tool level)", () => {
  test("who did I quote last week and never heard back from", async () => {
    const r = await run("find_jobs", { quoted_from: "2026-09-21", quoted_to: "2026-09-27", no_reply_since_quote: true });
    assert.deepEqual(names(r.jobs), ["Nadia Haddad", "Tom & Leah Davis"]);
  });

  test("the Davis kitchen resolves to exactly one person", async () => {
    for (const q of ["Davis kitchen", "the Davis kitchen", "Davis"]) {
      const r = await run("find_people", { query: q });
      assert.deepEqual(names(r.matches), ["Tom & Leah Davis"], q);
    }
  });

  test("draft text shows a card and sends nothing", async () => {
    const davis = (await run("find_people", { query: "Davis" })).matches[0];
    await run("prepare_text", { contact_id: davis.contact_id, message: "Hi Leah, just checking in on the kitchen quote. – Mara" });
    assert.equal(ctx.cards[0].type, "draft");
    assert.equal(book.activities.length, buildSeedBook(TODAY).activities.length, "drafting must not log anything");
  });

  test("booked in the next 14 days", async () => {
    const r = await run("find_jobs", { stages: ["booked"], wanted_from: TODAY, wanted_to: "2026-10-16" });
    assert.deepEqual(names(r.jobs), ["Chloe Nguyen", "Marcus Bell", "Robert & June Mackenzie"]);
  });

  test("add a note on Priya Shah + follow-up Thursday", async () => {
    const priya = (await run("find_people", { query: "Priya Shah" })).matches;
    assert.equal(priya.length, 1);
    const job = book.jobs.find((j) => j.contact_id === priya[0].contact_id)!;
    await run("add_note", { contact_id: priya[0].contact_id, job_id: job.id, text: "Wants the hallway included. Call Thursday." });
    await run("set_follow_up", { contact_id: priya[0].contact_id, date: "2026-10-08", reason: "Call about hallway" });
    const c = book.contacts.find((x) => x.id === priya[0].contact_id)!;
    assert.equal(c.follow_up_on, "2026-10-08");
    assert.match(book.jobs.find((j) => j.id === job.id)!.notes, /hallway included/);
    assert.ok(book.activities.some((a) => a.contact_id === c.id && a.kind === "note" && a.body.includes("hallway")));
  });
});

describe("never inventing customers", () => {
  test("unknown name returns no matches", async () => {
    const r = await run("find_people", { query: "Johnson" });
    assert.equal(r.count, 0);
    assert.deepEqual(r.matches, []);
  });

  test("writes to a made-up id are refused", async () => {
    await assert.rejects(run("add_note", { contact_id: "not-a-real-id", text: "x" }), ToolError);
    await assert.rejects(run("update_job", { job_id: "fake", stage: "booked" }), ToolError);
  });

  test("add_lead refuses an existing person", async () => {
    const r = await run("add_lead", { name: "Priya Shah" });
    assert.equal(r.ok, false);
    assert.equal(book.contacts.filter((c) => c.name === "Priya Shah").length, 1);
  });

  test("links to ids the assistant never saw are unlinked", () => {
    const real = book.contacts[0].id;
    const out = verifyLinks(`[A](/people/${real}) and [B](/people/made-up)`, new Set([real]), (id) => id === real);
    assert.equal(out, `[A](/people/${real}) and B`);
  });
});

describe("agent loop", () => {
  test("runs tools, streams status, and strips invented links", async () => {
    const davisId = book.contacts.find((c) => c.name.includes("Davis"))!.id;
    const replies = [
      {
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "t1", name: "find_people", input: { query: "Davis" } }],
      },
      {
        stop_reason: "end_turn",
        content: [{ type: "text", text: `Found [Tom & Leah Davis](/people/${davisId}). Also [Bob Smith](/people/abc-123).` }],
      },
    ];
    const requests: any[] = [];
    const fake = {
      beta: {
        messages: {
          create: async (req: any) => {
            requests.push(structuredClone(req));
            return replies.shift();
          },
        },
      },
    } as unknown as Anthropic;
    const events: ChatEvent[] = [];
    await runChat([{ role: "user", content: "find davis" }], createMemoryStore(() => book), (e) => events.push(e), fake);
    assert.deepEqual(events.map((e) => e.type), ["status", "text"]);
    const text = (events[1] as { text: string }).text;
    assert.ok(text.includes(`(/people/${davisId})`));
    assert.ok(text.includes("Also Bob Smith."));
    // second request carries the tool result back
    const last = requests[1].messages.at(-1);
    assert.equal(last.content[0].type, "tool_result");
    assert.equal(requests[0].fallbacks, "default");
  });
});

describe("import", () => {
  test("parses a Google Sheets paste with loose headers", () => {
    const { rows } = parseContacts("Client\tCell #\tEmail\tStreet address\tHow they found me\nJane Doe\t416-555-0000\tjane@x.com\t12 Main St\tinsta\nBob\t\t\t\tneighbour");
    assert.equal(rows.length, 2);
    assert.equal(rows[0].phone, "416-555-0000");
    assert.equal(rows[0].source, "Instagram");
    assert.equal(rows[1].source, "Neighbor");
  });
});
