import Anthropic from "@anthropic-ai/sdk";
import { runChat, type ChatEvent, type ChatTurn } from "@/lib/chat/agent";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

// Streams newline-delimited JSON events: status lines while tools run,
// cards for drafts/changes, then the final answer.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: ChatTurn[] } | null;
  const history = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Ask something first." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        if (!process.env.ANTHROPIC_API_KEY) {
          emit({ type: "error", text: "The assistant isn't switched on yet — add an ANTHROPIC_API_KEY in the app settings." });
        } else {
          await runChat(history, store(), emit);
        }
      } catch (err) {
        console.error("chat failed", err);
        const busy = err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError;
        emit({
          type: "error",
          text: busy ? "The assistant is busy right now. Try again in a minute." : "Something went wrong. Nothing was changed unless it says so above.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
