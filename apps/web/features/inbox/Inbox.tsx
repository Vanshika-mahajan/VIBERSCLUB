"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Empty, PageHeader } from "@/components/ui";
import { ChatsScreen } from "@/features/chats/ChatsScreen";
import { notesFor, type Note } from "@/lib/demo/notifications";
import { findEvent, viberById } from "@/lib/demo/people";
import { actions, getState, useDemo } from "@/lib/demo/store";

/** The bell on Home: notifications (matches, requests, your events and their group chats, new events
 * for your vibe) and your chats, in two tabs. */
export function Inbox() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") === "chats" ? "chats" : "notes";
  const setTab = (t: "notes" | "chats") => router.replace(t === "chats" ? "/inbox?tab=chats" : "/inbox", { scroll: false });

  return (
    <div className="max-w-2xl">
      <PageHeader kicker="Inbox" title="What's new">
        Your matches, requests, events and chats, in one place.
      </PageHeader>
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Notifications and chats">
        <button type="button" role="tab" aria-selected={tab === "notes"} className="chip" onClick={() => setTab("notes")}>
          Notifications
        </button>
        <button type="button" role="tab" aria-selected={tab === "chats"} className="chip" onClick={() => setTab("chats")}>
          Chats
        </button>
      </div>
      {tab === "notes" ? <Notes /> : <ChatsScreen embedded />}
    </div>
  );
}

function Notes() {
  const state = useDemo((s) => s);
  const [now] = useState(() => Date.now());
  const notes = useMemo(() => notesFor(state, now), [state, now]);
  // what is new is marked for this visit, then counted as seen
  const [fresh] = useState(() => new Set(notesFor(getState(), now).filter((n) => !getState().seenNotes.includes(n.id)).map((n) => n.id)));
  useEffect(() => {
    if (fresh.size) actions.markNotesSeen([...fresh]);
  }, [fresh]);

  if (!notes.length)
    return (
      <Empty>
        Nothing yet. <Link href="/discover" className="link">Find your people</Link> or <Link href="/events" className="link">join an event</Link>.
      </Empty>
    );
  return (
    <div role="tabpanel">
      <ul className="divide-y divide-line2 border-y border-ink" aria-label="Notifications">
        {notes.map((n) => (
          <li key={n.id}>
            <Link href={n.href} className="flex items-center gap-3 px-1 py-4 transition hover:bg-raised">
              <NoteMark note={n} />
              <span className="min-w-0 flex-1 text-sm text-ink">{n.text}</span>
              {fresh.has(n.id) && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-highlight" aria-label="New" role="img" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LABEL: Record<Note["kind"], string> = { match: "Match", request: "Request", event: "Event", group: "Group", suggest: "For you" };

function NoteMark({ note }: { note: Note }) {
  const v = note.viberId ? viberById[note.viberId] : undefined;
  if (v) return <Avatar name={v.name} src={v.photoUrl} size={44} />;
  const e = note.eventId ? findEvent(note.eventId, getState().hosted) : undefined;
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-wash text-[0.6rem] font-semibold tracking-wider text-ink2 uppercase" aria-hidden="true" title={e?.title}>
      {LABEL[note.kind]}
    </span>
  );
}
