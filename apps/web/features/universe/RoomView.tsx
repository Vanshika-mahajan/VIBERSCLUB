"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import d from "@/features/discover/discover.module.css";
import { Icon } from "@/features/discover/icons";
import { hashtag } from "@/features/discover/interpret";
import { initials } from "@/features/discover/sphere";
import type { Viber } from "@/features/discover/types";
import { interestById } from "@/lib/taxonomy";
import type { Room, RoomMessage } from "./sample-rooms";
import type { Screen } from "./sample-screens";
import { ago } from "./tiers";
import u from "./universe.module.css";

type Props = {
  room: Room;
  /** the people your thought pulled in first, then the room's members */
  people: Viber[];
  threads: Screen[];
  otherRooms: Room[];
  byId: Map<string, Viber>;
  leaving: boolean;
  onLeave: () => void;
  onSwitch: (room: Room) => void;
  onOpenPerson: (id: string, el: HTMLElement) => void;
};

/**
 * A collective room that was already talking before you arrived: recent messages and photos,
 * active threads, and the people who are here. Sample content; what you send stays in this browser.
 */
export function RoomView({ room, people, threads, otherRooms, byId, leaving, onLeave, onSwitch, onOpenPerson }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const endRef = useRef<HTMLLIElement>(null);
  const [mine, setMine] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [openThread, setOpenThread] = useState<string | null>(null);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [room.id]);
  useEffect(() => {
    if (mine.length) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [mine.length]);

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMine((m) => [...m, { id: `me-${Date.now()}`, authorId: "me", text, minutesAgo: 0 }]);
    setDraft("");
  }

  const name = (id: string) => (id === "me" ? "You" : (byId.get(id)?.name ?? "A Viber"));
  const messages = [...room.messages, ...mine];

  return (
    <section className={u.room} data-leaving={leaving} aria-labelledby="room-title">
      <header className={u.roomHead}>
        <button type="button" className={u.leave} onClick={onLeave}>
          <Icon name="back" /> Back to the universe
        </button>
        <p className={u.kicker}>
          Sample room · {room.memberCount + people.length} members · {room.interests.slice(0, 3).map((i) => hashtag(interestById[i].label)).join(" ")}
        </p>
        <h2 id="room-title" ref={titleRef} tabIndex={-1} className={u.roomTitle}>
          {room.title}
        </h2>
        <p className={u.roomBlurb}>{room.blurb}</p>
      </header>

      <div className={u.roomBody}>
        <div className={u.chat}>
          <ol className={u.msgs} aria-label="Conversation">
            {messages.map((m) => {
              const v = byId.get(m.authorId);
              return (
                <li key={m.id} className={u.msg} data-me={m.authorId === "me"}>
                  <span className={u.av} aria-hidden="true" style={v?.photoUrl ? { backgroundImage: `url("${v.photoUrl.replace("w=480", "w=120")}")` } : undefined}>
                    {v?.photoUrl ? "" : initials(name(m.authorId))}
                  </span>
                  <div>
                    <p className={u.who}>
                      <b>{name(m.authorId)}</b> <span>{m.minutesAgo ? ago(m.minutesAgo) + " ago" : "now"}</span>
                    </p>
                    <p className={u.text}>{m.text}</p>
                    {m.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- sample photos from a CDN, sized by CSS
                      <img className={u.shot} src={m.photoUrl} alt={m.photoAlt ?? "A shared photo"} loading="lazy" />
                    )}
                  </div>
                </li>
              );
            })}
            <li ref={endRef} aria-hidden="true" />
          </ol>
          <form className={u.composer} onSubmit={send}>
            <label className={d.sr} htmlFor="room-say">
              Say something to {room.title}
            </label>
            <input id="room-say" value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)} placeholder="Say something to the room" autoComplete="off" />
            <button type="submit" aria-label="Send">
              <Icon name="arrow" />
            </button>
          </form>
          <p className={u.note}>Demo room: what you send stays in this browser. Real rooms, with moderation and reporting, come later.</p>
        </div>

        <aside className={u.side} aria-label="In this room">
          <h3>Active threads</h3>
          <ul className={u.threads}>
            {threads.map((t) => (
              <li key={t.id}>
                <button type="button" aria-expanded={openThread === t.id} onClick={() => setOpenThread((x) => (x === t.id ? null : t.id))}>
                  <b>{t.title}</b>
                  <small>
                    {t.kind === "photo" ? "Photo" : "Thread"} by {name(t.authorId)} · {t.replies} {t.kind === "photo" ? "comments" : "replies"} · {ago(t.minutesAgo)}
                  </small>
                </button>
                {openThread === t.id && (
                  <div className={u.threadOpen}>
                    {t.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- sample photos from a CDN, sized by CSS
                      <img className={u.shot} src={t.photoUrl} alt={t.title} loading="lazy" />
                    )}
                    {t.snippet && <p>&ldquo;{t.snippet}&rdquo;</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <h3>People here</h3>
          <ul className={u.people}>
            {people.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={(e) => onOpenPerson(v.id, e.currentTarget)} aria-label={`${v.name}, ${v.role}. Open profile.`}>
                  <span className={u.av} aria-hidden="true" style={v.photoUrl ? { backgroundImage: `url("${v.photoUrl.replace("w=480", "w=120")}")` } : undefined}>
                    {v.photoUrl ? "" : initials(v.name)}
                  </span>
                  <span>
                    <b>{v.name}</b>
                    <small>{v.role}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {otherRooms.length > 0 && (
            <>
              <h3>Other rooms</h3>
              <ul className={u.others}>
                {otherRooms.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => onSwitch(r)}>
                      {r.title}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
