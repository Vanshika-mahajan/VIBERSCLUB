"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar, Empty, PageHeader, toast } from "@/components/ui";
import type { ChatMessage } from "@/lib/demo/data";
import { firstName, viberById } from "@/lib/demo/people";
import { actions, useDemo } from "@/lib/demo/store";
import { areas } from "@/lib/taxonomy";

const ago = (m: number) => (m < 1 ? "now" : m < 60 ? `${m} min` : m < 60 * 24 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);
const none: ChatMessage[] = [];

export function ChatsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const open = params.get("with");
  const connections = useDemo((s) => s.connections);
  const messages = useDemo((s) => s.messages);
  const [tab, setTab] = useState<"chats" | "requests">("chats");

  const entries = Object.entries(connections).filter(([id]) => viberById[id]);
  const chats = entries.filter(([, c]) => c === "connected").map(([id]) => id);
  const incoming = entries.filter(([, c]) => c === "incoming").map(([id]) => id);
  const sent = entries.filter(([, c]) => c === "requested").map(([id]) => id);

  if (open && connections[open] === "connected" && viberById[open]) return <Thread id={open} onBack={() => router.push("/chats")} />;

  return (
    <div className="max-w-2xl">
      <PageHeader kicker="Mutual only" title="Chats">
        You can message someone only after you both say yes.
      </PageHeader>
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Chats and requests">
        <button type="button" role="tab" aria-selected={tab === "chats"} className="chip" onClick={() => setTab("chats")}>
          Chats ({chats.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "requests"} className="chip" onClick={() => setTab("requests")}>
          Requests ({incoming.length})
        </button>
      </div>

      {tab === "chats" ? (
        chats.length ? (
          <ul className="card divide-y divide-line" role="tabpanel">
            {chats.map((id) => {
              const v = viberById[id];
              const last = (messages[id] ?? none).at(-1);
              return (
                <li key={id}>
                  <Link href={`/chats?with=${id}`} className="flex items-center gap-3 p-4 hover:bg-sand">
                    <Avatar name={v.name} src={v.photoUrl} size={48} />
                    <span className="min-w-0 flex-1">
                      <b className="block">{v.name}</b>
                      <small className="block truncate text-muted">{last ? `${last.from === "me" ? "You: " : ""}${last.text}` : "Say hello"}</small>
                    </span>
                    {last && <small className="text-muted">{ago(last.minutesAgo)}</small>}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>
            No chats yet. <Link href="/discover" className="link">Find your people</Link>, and when you both like each other you can connect.
          </Empty>
        )
      ) : (
        <div role="tabpanel" className="space-y-4">
          {incoming.length ? (
            <ul className="card divide-y divide-line">
              {incoming.map((id) => {
                const v = viberById[id];
                return (
                  <li key={id} className="flex flex-wrap items-center gap-3 p-4">
                    <Avatar name={v.name} src={v.photoUrl} size={48} />
                    <span className="min-w-0 flex-1">
                      <b className="block">{v.name}</b>
                      <small className="block text-muted">
                        {v.role} · {areas[v.area].label}
                      </small>
                    </span>
                    <span className="flex gap-2">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => (actions.declineConnection(id), toast("Request declined. They won't be told."))}>
                        Decline
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => (actions.acceptConnection(id), toast(`You and ${firstName(v)} are connected.`))}>
                        Accept
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No new requests.</Empty>
          )}
          {sent.length > 0 && (
            <p className="text-sm text-muted">
              Waiting on: {sent.map((id) => viberById[id].name).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const v = viberById[id];
  const list = useDemo((s) => s.messages[id]) ?? none;
  const reported = useDemo((s) => s.reported.includes(id));
  const [text, setText] = useState("");
  const [confirmBlock, setConfirmBlock] = useState(false);
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (actions.send(id, text)) setText("");
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <header className="card mb-3 flex items-center gap-3 p-3">
        <button type="button" className="btn-ghost btn-sm" onClick={onBack} aria-label="Back to chats">
          ←
        </button>
        <Avatar name={v.name} src={v.photoUrl} size={42} />
        <span className="min-w-0 flex-1">
          <h1 className="text-lg leading-tight font-extrabold">{v.name}</h1>
          <small className="text-muted">{areas[v.area].label}</small>
        </span>
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={reported}
          onClick={() => (actions.report(id), toast("Thanks. Our safety team reviews every report within a day."))}
        >
          {reported ? "Reported" : "Report"}
        </button>
        {confirmBlock ? (
          <button type="button" className="btn btn-sm btn-danger" onClick={() => (actions.block(id), toast(`${v.name} is blocked. Neither of you will see the other.`), onBack())}>
            Confirm block
          </button>
        ) : (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmBlock(true)}>
            Block
          </button>
        )}
      </header>
      <ol className="card min-h-[45vh] space-y-2 overflow-y-auto p-4" aria-label={`Messages with ${v.name}`}>
        <li className="pb-2 text-center text-xs text-muted">You connected. Meet in public places, and tell someone your plans.</li>
        {list.map((m) => (
          <li key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <span className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.from === "me" ? "bg-brand text-white" : "bg-sand text-ink"}`}>{m.text}</span>
          </li>
        ))}
        <li ref={end} aria-hidden="true" />
      </ol>
      <form className="mt-3 flex gap-2" onSubmit={submit}>
        <label className="sr-only" htmlFor="msg">
          Message {v.name}
        </label>
        <input id="msg" className="field flex-1" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder={`Message ${firstName(v)}`} autoComplete="off" />
        <button type="submit" className="btn" disabled={!text.trim()}>
          Send
        </button>
      </form>
      <p className="mt-2 text-xs text-muted">Sample chat: replies aren&apos;t simulated, and nothing is sent to anyone.</p>
    </div>
  );
}
