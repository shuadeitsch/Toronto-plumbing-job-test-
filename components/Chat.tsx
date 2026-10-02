"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { ChatEvent } from "@/lib/chat/agent";
import type { Card } from "@/lib/chat/tools";
import { IconCheck, IconCopy, IconSend, IconText } from "./icons";

type Msg =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; cards: Card[]; steps: string[]; error?: string; pending?: boolean };

const KEY = "book-chat-v1";

const SUGGESTIONS = [
  "Who did I quote last week and never heard back from?",
  "Which jobs are booked in the next 14 days?",
  "Draft a short text to the Davis kitchen. Polite, not salesy.",
  "Who still owes me money?",
];

/** What the model sees of an earlier assistant turn: its words plus what it did. */
function asHistory(m: Msg): { role: "user" | "assistant"; content: string } {
  if (m.role === "user") return { role: "user", content: m.text };
  const did = m.cards.map((c) =>
    c.type === "draft" ? `(Drafted text to ${c.name}: "${c.body}")` : `(${c.label}${c.detail ? `: ${c.detail}` : ""})`,
  );
  return { role: "assistant", content: [m.text || m.error || "", ...did].filter(Boolean).join("\n") };
}

export function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) setMsgs((JSON.parse(saved) as Msg[]).filter((m) => m.role === "user" || !m.pending));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs));
    } catch {}
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setInput("");
      setBusy(true);
      const history: Msg[] = [...msgsRef.current, { role: "user", text: q }];
      setMsgs([...history, { role: "assistant", text: "", cards: [], steps: [], pending: true }]);
      const update = (fn: (m: Extract<Msg, { role: "assistant" }>) => void) =>
        setMsgs((prev) => {
          const next = [...prev];
          const last = { ...(next[next.length - 1] as Extract<Msg, { role: "assistant" }>) };
          last.cards = [...last.cards];
          last.steps = [...last.steps];
          fn(last);
          next[next.length - 1] = last;
          return next;
        });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-16).map(asHistory) }),
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok || !res.body) throw new Error(String(res.status));
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let changed = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const e = JSON.parse(line) as ChatEvent;
            if (e.type === "status") update((m) => m.steps.push(e.text));
            if (e.type === "card") {
              if (e.card.type === "change") changed = true;
              update((m) => m.cards.push(e.card));
            }
            if (e.type === "text") update((m) => (m.text = e.text));
            if (e.type === "error") update((m) => (m.error = e.text));
          }
        }
        if (changed) router.refresh();
      } catch {
        update((m) => (m.error = "Couldn't reach the book. Check your connection and try again."));
      } finally {
        update((m) => (m.pending = false));
        setBusy(false);
      }
    },
    [busy, router],
  );

  useEffect(() => {
    const q = params.get("q");
    if (q && !started.current) {
      started.current = true;
      router.replace("/ask");
      send(q);
    }
  }, [params, router, send]);

  return (
    <div className="chat">
      <div className="chat-log" aria-live="polite">
        {msgs.length === 0 && (
          <div>
            <p className="chat-intro">
              Ask about your customers and jobs, or tell it what to note down. Answers come only from your book — if someone isn&apos;t in it, it will say so.
            </p>
            <div className="suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="msg user">{m.text}</div>
          ) : (
            <Fragment key={i}>
              {(m.pending || m.steps.length > 0) && (
                <div className="status">
                  {m.steps.map((s, j) => <span key={j}>{s}</span>)}
                  {m.pending && !m.text && <div className="thinking" aria-label="Working"><i /><i /><i /></div>}
                </div>
              )}
              {m.cards.map((c, j) => (c.type === "draft" ? <Draft key={j} card={c} /> : <Change key={j} card={c} />))}
              {m.text && <div className="msg bot"><Rich text={m.text} /></div>}
              {m.error && <div className="msg bot err">{m.error}</div>}
            </Fragment>
          ),
        )}
        <div ref={endRef} className="chat-end" />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask, or say what to note down…"
          aria-label="Message"
          enterKeyHint="send"
        />
        <button className="send" type="submit" disabled={busy || !input.trim()} aria-label="Send">
          <IconSend />
        </button>
      </form>
      {msgs.length > 0 && !busy && (
        <button type="button" className="btn ghost sm mt-8" style={{ alignSelf: "center" }} onClick={() => setMsgs([])}>
          Clear conversation
        </button>
      )}
    </div>
  );
}

function Draft({ card }: { card: Extract<Card, { type: "draft" }> }) {
  const [body, setBody] = useState(card.body);
  const [copied, setCopied] = useState(false);
  const phone = card.phone?.replace(/[^\d+]/g, "");
  return (
    <div className="draft">
      <div className="draft-to">Text to <Link href={`/people/${card.contactId}`} style={{ color: "var(--accent)" }}>{card.name}</Link>{card.phone ? ` · ${card.phone}` : " · no phone on file"}</div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="Draft text" />
      <div className="actions">
        <button
          type="button"
          className="btn sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(body);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {}
          }}
        >
          {copied ? <IconCheck /> : <IconCopy />} {copied ? "Copied" : "Copy"}
        </button>
        {phone && (
          <a className="btn sm primary" href={`sms:${phone}?&body=${encodeURIComponent(body)}`}>
            <IconText /> Open in Messages
          </a>
        )}
      </div>
    </div>
  );
}

function Change({ card }: { card: Extract<Card, { type: "change" }> }) {
  return (
    <Link href={card.href} className="change">
      <IconCheck />
      <div>
        <b>{card.label}</b>
        {card.detail && <span>{card.detail}</span>}
      </div>
    </Link>
  );
}

/** Tiny formatter: paragraphs, "- " lists, and internal links only. Everything else is plain text. */
function Rich({ text }: { text: string }) {
  const blocks = text.replace(/\*\*(.+?)\*\*/g, "$1").split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const items = lines.filter((l) => /^\s*[-•]\s+/.test(l));
        if (items.length && items.length === lines.filter((l) => l.trim()).length) {
          return <ul key={i}>{items.map((l, j) => <li key={j}><Inline text={l.replace(/^\s*[-•]\s+/, "")} /></li>)}</ul>;
        }
        if (items.length) {
          return (
            <Fragment key={i}>
              {lines.filter((l) => !/^\s*[-•]\s+/.test(l) && l.trim()).map((l, j) => <p key={`p${j}`}><Inline text={l} /></p>)}
              <ul>{items.map((l, j) => <li key={j}><Inline text={l.replace(/^\s*[-•]\s+/, "")} /></li>)}</ul>
            </Fragment>
          );
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}<Inline text={l} /></Fragment>)}</p>;
      })}
    </>
  );
}

function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((\/(?:people|jobs)\/[A-Za-z0-9-]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<Link key={m.index} href={m[2]}>{m[1]}</Link>);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
