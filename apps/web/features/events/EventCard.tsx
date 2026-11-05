"use client";

import Link from "next/link";
import { Avatar, Cover } from "@/components/ui";
import type { DemoEvent } from "@/lib/demo/data";
import { formatWhen, price, viberById } from "@/lib/demo/people";
import { useDemo } from "@/lib/demo/store";
import { useToday } from "@/lib/demo/useToday";
import { areas } from "@/lib/taxonomy";

export function EventCard({ e, compact = false, lead = false }: { e: DemoEvent; compact?: boolean; lead?: boolean }) {
  const today = useToday();
  const rsvp = useDemo((s) => s.rsvps[e.id]);
  const host = viberById[e.hostId];
  const going = e.goingIds.length + (rsvp === "going" && !e.goingIds.includes("me") ? 1 : 0);
  const full = going >= e.capacity;
  return (
    <Link href={`/events/${e.id}`} className="group block border-t border-ink pt-3">
      <Cover
        src={e.photoUrl}
        className={`${lead ? "h-64 md:h-[460px]" : compact ? "h-40" : "h-52"} [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-[cubic-bezier(.2,.7,.2,1)] group-hover:[&_img]:scale-[1.04]`}
      >
        <span className={`absolute top-3 left-3 px-2 py-1 text-[0.64rem] font-medium tracking-[0.14em] uppercase ${e.priceInr > 0 ? "bg-espresso text-ivory" : "bg-ivory text-ink"}`}>{price(e)}</span>
        {rsvp && (
          <span className="absolute top-3 right-3 flex items-center gap-1.5 bg-ivory px-2 py-1 text-[0.64rem] font-medium tracking-[0.14em] text-ink uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
            {rsvp === "going" ? "You're going" : "On waitlist"}
          </span>
        )}
      </Cover>
      <div className="space-y-2 pt-4">
        <p className="kicker text-accent">{today ? formatWhen(e, today) : e.time}</p>
        <h3 className="font-display text-xl leading-[1.02] font-bold tracking-[-0.025em]">
          {e.title} <span className="arrow text-base" aria-hidden="true">→</span>
        </h3>
        <p className="text-sm text-muted">
          {areas[e.area].label} · {full ? "Full, waitlist open" : `${e.capacity - going} of ${e.capacity} seats left`}
        </p>
        {host && !compact && (
          <p className="flex items-center gap-2 text-sm text-ink2">
            <Avatar name={host.name} src={host.photoUrl} size={26} /> Hosted by {host.name}
          </p>
        )}
      </div>
    </Link>
  );
}
