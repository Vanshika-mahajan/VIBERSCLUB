"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar, Empty, PageHeader, toast } from "@/components/ui";
import type { ChatMessage, DemoEvent } from "@/lib/demo/data";
import { groupStatus, type GroupStatus } from "@/lib/demo/groups";
import { allEvents, firstName, viberById } from "@/lib/demo/people";
import { actions, useDemo } from "@/lib/demo/store";
import { areas } from "@/lib/taxonomy";
import { playSound } from "@/lib/sound";

const ago = (m: number) => (m < 1 ? "now" : m < 60 ? `${m} min` : m < 60 * 24 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);
const none: ChatMessage[] = [];

/** Chats with people you are connected to, event group chats, and requests. `embedded` sits inside
 * the inbox (the bell on Home), without its own page title. */
export function ChatsScreen({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const open = params.get("with");
  const groupId = params.get("group");
  const connections = useDemo((s) => s.connections);
  const messages = useDemo((s) => s.messages);
  const groups = useGroups();
  const [tab, setTab] = useState<"chats" | "requests">("chats");
  const back = () => router.push("/inbox?tab=chats");

  const entries = Object.entries(connections).filter(([id]) => viberById[id]);
  const chats = entries.filter(([, c]) => c === "connected").map(([id]) => id);
  const incoming = entries.filter(([, c]) => c === "incoming").map(([id]) => id);
  const sent = entries.filter(([, c]) => c === "requested").map(([id]) => id);

  if (open && connections[open] === "connected" && viberById[open]) return <Thread id={open} onBack={back} />;
  const group = groups.find((g) => g.event.id === groupId);
  if (group) return <GroupThread event={group.event} status={group.status} onBack={back} />;

  return (
    <div className="max-w-2xl">
      {!embedded && (
        <PageHeader kicker="Mutual only" title="Chats">
          You can message someone only after you both say yes.
        </PageHeader>
      )}
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Chats and requests">
        <button type="button" role="tab" aria-selected={tab === "chats"} className="chip" onClick={() => setTab("chats")}>
          Chats ({chats.length + groups.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "requests"} className="chip" onClick={() => setTab("requests")}>
          Requests ({incoming.length})
        </button>
      </div>

      {tab === "chats" ? (
        chats.length || groups.length ? (
          <div role="tabpanel">
          <ul className="card divide-y divide-line">
            {groups.map(({ event: e, status, last }) => (
              <li key={e.id}>
                <Link href={`/chats?group=${e.id}`} className="flex items-center gap-3 p-4 hover:bg-sand">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-wash text-xs font-extrabold text-ink2" aria-hidden="true">
                    {e.goingIds.length + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block">{e.title}</b>
                    <small className="block truncate text-muted">
                      {status === "ended" ? "Event ended · read only" : last ? `${last.from === "me" ? "You: " : ""}${last.text}` : `Group chat · ${e.goingIds.length + 1} going`}
                    </small>
                  </span>
                  <small className="text-muted">Group</small>
                </Link>
              </li>
            ))}
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
          </div>
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
                      <button type="button" className="btn btn-sm" onClick={() => (playSound("connect"), actions.acceptConnection(id), toast(`You and ${firstName(v)} are connected.`))}>
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
            <span className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.from === "me" ? "bg-brand text-ink" : "bg-sand text-ink"}`}>{m.text}</span>
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

/** the event group chats I am in: joined (going), not deleted, and not gone (the day after it ended) */
function useGroups() {
  const rsvps = useDemo((s) => s.rsvps);
  const joinedAt = useDemo((s) => s.joinedAt);
  const hosted = useDemo((s) => s.hosted);
  const hidden = useDemo((s) => s.hiddenGroups);
  const msgs = useDemo((s) => s.groupMessages);
  const [now] = useState(() => Date.now());
  return allEvents(hosted)
    .filter((e) => rsvps[e.id] === "going" && !hidden.includes(e.id))
    .map((e) => ({ event: e, status: groupStatus(e, joinedAt[e.id], now), last: (msgs[e.id] ?? none).at(-1) }))
    .filter((g) => g.status !== "gone");
}

function GroupThread({ event: e, status, onBack }: { event: DemoEvent; status: GroupStatus; onBack: () => void }) {
  const list = useDemo((s) => s.groupMessages[e.id]) ?? none;
  const host = viberById[e.hostId];
  const members = e.goingIds.map((id) => viberById[id]).filter(Boolean);
  const [text, setText] = useState("");
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [list.length]);
  const ended = status !== "open";

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <header className="card mb-3 flex items-center gap-3 p-3">
        <button type="button" className="btn-ghost btn-sm" onClick={onBack} aria-label="Back to chats">
          ←
        </button>
        <span className="min-w-0 flex-1">
          <h1 className="text-lg leading-tight font-extrabold">{e.title}</h1>
          <small className="text-muted">
            Group chat · you and {plural(members.length, "other")}
            {host ? ` · hosted by ${firstName(host)}` : ""}
          </small>
        </span>
        <Link href={`/events/${e.id}`} className="btn-ghost btn-sm">
          Event
        </Link>
        {ended && (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            data-sound="remove"
            onClick={() => {
              if (!window.confirm(`Delete the chat for "${e.title}"? It's only removed for you.`)) return;
              actions.deleteGroup(e.id);
              toast("Chat deleted.");
              onBack();
            }}
          >
            Delete chat
          </button>
        )}
      </header>
      <ol className="card min-h-[45vh] space-y-2 overflow-y-auto p-4" aria-label={`Messages in ${e.title}`}>
        <li className="pb-2 text-center text-xs text-muted">
          Everyone going is here. The chat closes when the event ends. Meet at {e.meetingPoint}.
        </li>
        {host && (
          <li className="flex justify-start">
            <span className="max-w-[80%] rounded-2xl bg-sand px-3.5 py-2 text-sm text-ink">
              <b className="block text-xs text-muted">{firstName(host)}</b>
              Welcome! See you at {e.meetingPoint} at {e.time}.
            </span>
          </li>
        )}
        {list.map((m) => (
          <li key={m.id} className="flex justify-end">
            <span className="max-w-[80%] rounded-2xl bg-brand px-3.5 py-2 text-sm text-ink">{m.text}</span>
          </li>
        ))}
        <li ref={end} aria-hidden="true" />
      </ol>
      {ended ? (
        <p className="mt-3 rounded-2xl border border-line2 p-3 text-center text-sm text-muted" role="status">
          This event has ended, so the chat is read only. You can delete it.
        </p>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (actions.sendGroup(e, text)) setText("");
          }}
        >
          <label className="sr-only" htmlFor="gmsg">
            Message the group
          </label>
          <input id="gmsg" className="field flex-1" value={text} maxLength={2000} onChange={(ev) => setText(ev.target.value)} placeholder="Message the group" autoComplete="off" />
          <button type="submit" className="btn" disabled={!text.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
