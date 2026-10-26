"use client";

import Link from "next/link";
import { Avatar, Cover, Empty, SampleBadge, toast } from "@/components/ui";
import { formatWhen, findEvent, price, viberById } from "@/lib/demo/people";
import { actions, useDemo } from "@/lib/demo/store";
import { useToday } from "@/lib/demo/useToday";
import { areas, interestById } from "@/lib/taxonomy";

export function EventScreen({ id }: { id: string }) {
  const hosted = useDemo((s) => s.hosted);
  const rsvp = useDemo((s) => s.rsvps[id]);
  const blocked = useDemo((s) => s.blocked);
  const today = useToday();
  const e = findEvent(id, hosted);

  if (!e || blocked.includes(e.hostId)) {
    return (
      <Empty>
        <h1 className="mb-2 text-xl font-extrabold text-ink">Event not found</h1>
        It may have ended or been removed. <Link href="/events" className="font-bold text-blue">See all events</Link>
      </Empty>
    );
  }
  const mine = e.hostId === "me";
  const host = viberById[e.hostId];
  const goers = e.goingIds.map((g) => viberById[g]).filter((v) => v && !blocked.includes(v.id));
  const going = e.goingIds.length + (rsvp === "going" && !mine ? 1 : 0);
  const full = e.goingIds.length >= e.capacity;

  const join = () => {
    const status = actions.rsvp(e);
    toast(status === "going" ? `You're going to ${e.title}.` : "It's full, so you're on the waitlist. We'll tell you if a seat opens.");
  };

  return (
    <article>
      <Link href="/events" className="mb-4 inline-flex text-sm font-bold text-blue">
        ← All events
      </Link>
      <Cover src={e.photoUrl} className="h-56 rounded-3xl md:h-72">
        {e.sample && (
          <span className="absolute top-3 left-3">
            <SampleBadge />
          </span>
        )}
      </Cover>
      <div className="mt-5 grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="kicker">{today ? formatWhen(e, today) : e.time} · {e.durationHours >= 24 ? `${Math.round(e.durationHours / 24)} days` : `${e.durationHours} h`}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em] md:text-4xl">{e.title}</h1>
          <p className="mt-3 text-ink2">{e.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {e.interests.map((i) => (
              <span key={i} className="chip">
                {interestById[i]?.label ?? i}
              </span>
            ))}
          </div>
          <h2 className="kicker mt-6 mb-2">Who&apos;s going</h2>
          <ul className="flex flex-wrap gap-3">
            {rsvp === "going" && !mine && (
              <li className="flex items-center gap-2 text-sm font-semibold">
                <Avatar name="You" size={34} /> You
              </li>
            )}
            {goers.map((v) => (
              <li key={v.id} className="flex items-center gap-2 text-sm font-semibold">
                <Avatar name={v.name} src={v.photoUrl} size={34} /> {v.name.split(" ")[0]}
              </li>
            ))}
          </ul>
        </div>
        <aside className="card h-fit space-y-4 p-5" aria-label="Join this event">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold">{price(e)}</span>
            <span className="text-sm font-semibold text-muted">{full ? "Full" : `${Math.max(0, e.capacity - going)} of ${e.capacity} seats left`}</span>
          </div>
          <p className="text-sm text-ink2">
            <b>Meet at:</b> {e.meetingPoint}, {areas[e.area].label}
          </p>
          {e.priceInr > 0 && <p className="rounded-2xl bg-haze p-3 text-sm text-ink2">The host collects payment directly. Vibers Club doesn&apos;t take money in this version.</p>}
          {mine ? (
            <p className="font-bold text-ok">You&apos;re hosting this.</p>
          ) : rsvp ? (
            <div className="space-y-2">
              <p className="font-bold">{rsvp === "going" ? "You're going." : "You're on the waitlist."}</p>
              <button type="button" className="btn-ghost w-full" onClick={() => (actions.leave(e.id), toast(rsvp === "going" ? "You left the event." : "You left the waitlist."))}>
                {rsvp === "going" ? "Leave event" : "Leave waitlist"}
              </button>
            </div>
          ) : (
            <button type="button" className="btn w-full" onClick={join}>
              {full ? "Join waitlist" : "Join"}
            </button>
          )}
          <div className="flex items-center gap-3 border-t border-line pt-4">
            <Avatar name={mine ? "You" : (host?.name ?? "Host")} src={host?.photoUrl} size={42} />
            <span className="text-sm">
              <span className="block text-muted">Hosted by</span>
              <b>{mine ? "You" : host?.name}</b>
            </span>
          </div>
        </aside>
      </div>
    </article>
  );
}
