"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { areas, interestById } from "@/lib/taxonomy";
import { actions, useDemo } from "@/lib/demo/store";
import {
  allEvents,
  eventDate,
  firstName,
  price,
  viberById,
} from "@/lib/demo/people";
import { toast } from "@/components/ui";
import { useToday } from "@/lib/demo/useToday";
import { Photo, SampleTag, useMyThought } from "./shared";
import s from "./club.module.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "you", label: "For you" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "free", label: "Free" },
  { id: "going", label: "Going" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

/** Events: what's on in the valley, with a one-tap join (or waitlist when it's full). */
export function Events() {
  const hosted = useDemo((st) => st.hosted);
  const rsvps = useDemo((st) => st.rsvps);
  const blocked = useDemo((st) => st.blocked);
  const thought = useMyThought();
  const today = useToday();
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const mine = new Set(thought.interests);
    const fit = (ids: string[]) => ids.filter((i) => mine.has(i)).length;
    return allEvents(hosted)
      .filter((e) => !blocked.includes(e.hostId))
      .filter((e) => {
        if (filter === "you") return fit(e.interests) > 0;
        if (filter === "today") return e.dayOffset === 0;
        if (filter === "week") return e.dayOffset < 7;
        if (filter === "free") return e.priceInr === 0;
        if (filter === "going") return Boolean(rsvps[e.id]);
        return true;
      })
      .sort(
        (a, b) =>
          (filter === "you" ? fit(b.interests) - fit(a.interests) : 0) ||
          a.dayOffset - b.dayOffset ||
          a.time.localeCompare(b.time),
      );
  }, [hosted, rsvps, blocked, filter, thought]);

  return (
    <section aria-labelledby="events-title">
      <div className={s.sectionHead}>
        <div>
          <h2 id="events-title" className={s.h2}>
            What&apos;s on in the valley
          </h2>
          <p className={`${s.muted} ${s.small}`} style={{ margin: "4px 0 0" }}>
            Treks, café crawls, bonfires and workshops, hosted by Vibers.
          </p>
        </div>
        <Link href="/events/new" className={s.btn}>
          Host an event
        </Link>
      </div>
      <div
        className={s.chips}
        role="group"
        aria-label="Filter events"
        style={{ marginBottom: 18 }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={s.chip}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className={s.empty}>
          Nothing here yet. Try another filter, or host something yourself.
        </div>
      ) : (
        <ul
          className={s.grid}
          style={{ listStyle: "none", margin: 0, padding: 0 }}
        >
          {list.map((e) => {
            const host = viberById[e.hostId];
            const status = rsvps[e.id];
            const going = e.goingIds.length + (status === "going" ? 1 : 0);
            const full = e.goingIds.length >= e.capacity;
            const when = today ? eventDate(e, today) : null;
            return (
              <li key={e.id} className={`${s.card} ${s.eventCard}`}>
                <Photo src={e.photoUrl} className={s.eventPhoto}>
                  <span className={s.date} aria-hidden="true">
                    <span>
                      {when
                        ? when.toLocaleDateString("en-IN", { month: "short" })
                        : e.dayOffset === 0
                          ? "Today"
                          : `+${e.dayOffset}d`}
                    </span>
                    <b>{when ? when.getDate() : ""}</b>
                  </span>
                  <span className={s.price}>{price(e)}</span>
                </Photo>
                <div className={s.eventBody}>
                  <Link
                    href={`/events/${e.id}`}
                    className={s.h3}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {e.title}
                  </Link>
                  <p className={`${s.muted} ${s.small}`}>
                    {e.dayOffset === 0
                      ? "Today"
                      : e.dayOffset === 1
                        ? "Tomorrow"
                        : when
                          ? when.toLocaleDateString("en-IN", {
                              weekday: "long",
                            })
                          : ""}{" "}
                    · {e.time} · {areas[e.area].label}
                  </p>
                  <div className={s.chips} style={{ gap: 5 }}>
                    {e.interests.slice(0, 3).map((i) => (
                      <span
                        key={i}
                        className={s.tag}
                        data-tone={
                          thought.interests.includes(i) ? undefined : "clover"
                        }
                      >
                        {interestById[i]?.label ?? i}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <div className={s.seats} aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.min(100, (going / e.capacity) * 100)}%`,
                        }}
                      />
                    </div>
                    <p
                      className={`${s.muted} ${s.small}`}
                      style={{ marginTop: 5 }}
                    >
                      {going} of {e.capacity} going
                      {host ? ` · hosted by ${firstName(host)}` : ""}
                    </p>
                  </div>
                  <div
                    className={s.row}
                    style={{ marginTop: "auto", paddingTop: 6 }}
                  >
                    {status ? (
                      <button
                        type="button"
                        className={s.ghost}
                        onClick={() => {
                          actions.leave(e.id);
                          toast(`You left ${e.title}.`);
                        }}
                      >
                        {status === "going" ? "Going ✓" : "On the waitlist"} ·
                        Leave
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={s.btn}
                        data-tone="rose"
                        onClick={() => {
                          const r = actions.rsvp(e);
                          toast(
                            r === "going"
                              ? `You're going to ${e.title}.`
                              : `It's full, so you're on the waitlist.`,
                          );
                        }}
                      >
                        {full ? "Join waitlist" : "Join"}
                      </button>
                    )}
                    <Link href={`/events/${e.id}`} className={s.ghost}>
                      Details
                    </Link>
                    <span className={s.spacer} />
                    {e.sample && <SampleTag />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
