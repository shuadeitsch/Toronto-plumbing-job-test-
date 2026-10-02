import Anthropic from "@anthropic-ai/sdk";
import { addDays, todayISO, weekday, weekStart } from "../dates";
import type { Store } from "../store/types";
import { runTool, TOOL_STATUS, TOOLS, ToolError, type Card, type ToolContext } from "./tools";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const MAX_ROUNDS = 8;

const SYSTEM = `You are the assistant inside Mara Ellison's job book. Mara owns Ellison & Co. Home Refresh, a two-person house painting crew in Toronto (Mara and one painter). She uses this on her phone between jobs.

How you work:
- Your only knowledge of her customers and jobs is what the tools return. Look things up before answering; never answer about a person, job, date or amount from memory or assumption.
- Never invent a customer, job, phone number, amount or date. If a search comes back empty, say plainly that you can't find them in the book and suggest how she might be spelling it. If several people match, ask which one before changing anything.
- When she asks you to change something (add a note, set a follow-up, move a job, mark paid), find the right record first, then make the change with the matching tool. Don't ask for confirmation on small, clearly requested changes — just do it and say what you did. Ask first only if it's ambiguous which person or job she means.
- "Call Thursday", "follow up Monday" and similar mean: also set a follow-up date with set_follow_up, using the next such day after today.
- When she asks you to draft or write a text, always use prepare_text so it appears with Copy and Open in Messages buttons. Write like Mara: warm, short, plain, Canadian spelling, no exclamation-mark pile-ups, no sales pitch, no emojis. Use first names. Mention the specific room or job. Sign off "– Mara". Then just say one short line like "Here's a draft." — don't repeat the text.
- She can't see tool output. Answer in short plain sentences. Use a "- " list when listing more than two things. No headings, no tables, no bold.
- Link each person or job you mention the first time, using only ids returned by the tools: [Name](/people/CONTACT_ID) or [Room](/jobs/JOB_ID). Never make up an id.
- Money is Canadian dollars, written like $2,850. Dates as weekday + month + day, e.g. Thu Oct 8.
- "Touched" or "contacted" means anything logged in their history. "Never heard back" means nothing logged as heard back since the quote went out.
- Keep it brief. She's on a ladder.`;

function dateContext(today: string): string {
  const thisMon = weekStart(today);
  const lastMon = addDays(thisMon, -7);
  return `Today is ${weekday(today)} ${today} (Toronto). This week: ${thisMon} to ${addDays(thisMon, 6)}. Last week: ${lastMon} to ${addDays(lastMon, 6)}. Next 14 days: ${today} to ${addDays(today, 14)}.`;
}

export type ChatEvent =
  | { type: "status"; text: string }
  | { type: "card"; card: Card }
  | { type: "text"; text: string }
  | { type: "error"; text: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Drop links that point at a record the assistant never actually looked up, or
 * that doesn't exist. A made-up id can't render as a real link.
 */
export function verifyLinks(text: string, seen: Set<string>, exists: (id: string) => boolean): string {
  return text.replace(/\[([^\]]+)\]\((\/(?:people|jobs)\/([^)\s]+))\)/g, (_m, label: string, _href, id: string) =>
    seen.has(id) && exists(id) ? `[${label}](${_href})` : label,
  );
}

export async function runChat(
  history: ChatTurn[],
  store: Store,
  emit: (e: ChatEvent) => void,
  client: Anthropic = new Anthropic(),
): Promise<void> {
  const today = todayISO();
  const ctx: ToolContext = { store, today, seen: new Set(), cards: [] };
  const messages: Anthropic.Beta.BetaMessageParam[] = history
    .filter((t) => t.content.trim())
    .slice(-16)
    .map((t) => ({ role: t.role, content: t.content }));
  if (messages[0]?.role !== "user") messages.shift();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      // On a safety decline, re-run on Anthropic's recommended fallback model.
      fallbacks: "default",
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" },
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: dateContext(today) },
      ],
      tools: TOOLS,
      messages,
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);

    if (response.stop_reason === "refusal") {
      emit({ type: "error", text: "I can't help with that one." });
      return;
    }

    messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      if (response.stop_reason === "pause_turn") continue;
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      const book = await store.load();
      const ids = new Set([...book.contacts.map((c) => c.id), ...book.jobs.map((j) => j.id)]);
      emit({ type: "text", text: verifyLinks(text, ctx.seen, (id) => ids.has(id)) });
      return;
    }

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const input = (use.input ?? {}) as Record<string, unknown>;
      emit({ type: "status", text: TOOL_STATUS[use.name]?.(input) ?? "Working" });
      const before = ctx.cards.length;
      try {
        const out = await runTool(use.name, input, ctx);
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(out) });
      } catch (err) {
        const message = err instanceof ToolError ? err.message : "That didn't work — the book couldn't be updated.";
        if (!(err instanceof ToolError)) console.error(`tool ${use.name} failed`, err);
        results.push({ type: "tool_result", tool_use_id: use.id, content: message, is_error: true });
      }
      for (const card of ctx.cards.slice(before)) emit({ type: "card", card });
    }
    messages.push({ role: "user", content: results });
  }

  emit({ type: "text", text: "That took more steps than I expected. Try asking a narrower question." });
}
