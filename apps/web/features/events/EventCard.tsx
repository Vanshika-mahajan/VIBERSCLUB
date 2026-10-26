"use client";

import Link from "next/link";
import { Avatar, Cover } from "@/components/ui";
import type { DemoEvent } from "@/lib/demo/data";
import { formatWhen, price, viberById } from "@/lib/demo/people";
import { useDemo } from "@/lib/demo/store";
import { useToday } from "@/lib/demo/useToday";
import { areas } from "@/lib/taxonomy";

export function EventCard({ e, compact = false }: { e: DemoEvent; compact?: boolean }) {
  const today = useToday();
  const rsvp = useDemo((s) => s.rsvps[e.id]);
  const host = viberById[e.hostId];
  const going = e.goingIds.length + (rsvp === "going" && !e.goingIds.includes("me") ? 1 : 0);
  const full = going >= e.capacity;
  return (
    <Link href={`/events/${e.id}`} className="card group block overflow-hidden transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-soft">
      <Cover src={e.photoUrl} className={compact ? "h-28" : "h-36"}>
        <span className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-extrabold shadow-card ${e.priceInr > 0 ? "bg-gold text-ink" : "bg-surface/95 text-brand"}`}>{price(e)}</span>
        {rsvp && (
          <span className="absolute top-3 right-3 rounded-full bg-brand px-2.5 py-1 text-xs font-extrabold text-white">{rsvp === "going" ? "You're going" : "On waitlist"}</span>
        )}
      </Cover>
      <div className="space-y-2 p-4">
        <p className="text-xs font-bold text-accent">{today ? formatWhen(e, today) : e.time}</p>
        <h3 className="text-lg leading-tight font-extrabold tracking-[-0.02em]">{e.title}</h3>
        <p className="text-sm text-muted">
          {areas[e.area].label} · {full ? "Full, waitlist open" : `${e.capacity - going} of ${e.capacity} seats left`}
        </p>
        {host && !compact && (
          <p className="flex items-center gap-2 text-sm font-semibold text-ink2">
            <Avatar name={host.name} src={host.photoUrl} size={26} /> Hosted by {host.name}
          </p>
        )}
      </div>
    </Link>
  );
}
