"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Empty, PageHeader } from "@/components/ui";
import { allEvents } from "@/lib/demo/people";
import { useDemo } from "@/lib/demo/store";
import { interestById } from "@/lib/taxonomy";
import { EventCard } from "./EventCard";

const WHEN = [
  { id: "all", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
] as const;
const COST = [
  { id: "all", label: "Free and paid" },
  { id: "free", label: "Free" },
  { id: "paid", label: "Paid" },
] as const;

export function EventsScreen() {
  const hosted = useDemo((s) => s.hosted);
  const blocked = useDemo((s) => s.blocked);
  const rsvps = useDemo((s) => s.rsvps);
  const [when, setWhen] = useState<(typeof WHEN)[number]["id"]>("all");
  const [cost, setCost] = useState<(typeof COST)[number]["id"]>("all");
  const [interest, setInterest] = useState<string | null>(null);

  const pool = useMemo(() => allEvents(hosted).filter((e) => !blocked.includes(e.hostId)), [hosted, blocked]);
  const topInterests = useMemo(() => {
    const n = new Map<string, number>();
    pool.forEach((e) => e.interests.forEach((i) => n.set(i, (n.get(i) ?? 0) + 1)));
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([i]) => i);
  }, [pool]);
  const list = pool
    .filter((e) => (when === "today" ? e.dayOffset === 0 : when === "week" ? e.dayOffset <= 6 : true))
    .filter((e) => (cost === "free" ? e.priceInr === 0 : cost === "paid" ? e.priceInr > 0 : true))
    .filter((e) => !interest || e.interests.includes(interest))
    .sort((a, b) => a.dayOffset - b.dayOffset || a.time.localeCompare(b.time));
  const mine = pool.filter((e) => rsvps[e.id]);

  return (
    <div>
      <PageHeader kicker="Manali this week" title="Events">
        Small plans hosted by Vibers. Free ones are the default; paid hosts collect payment themselves.
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/events/new" className="btn">
          Host an event
        </Link>
        {mine.length > 0 && <span className="text-sm font-semibold text-muted">You&apos;re in {mine.length} {mine.length === 1 ? "plan" : "plans"}</span>}
      </div>

      <div className="space-y-2" role="group" aria-label="Filter events">
        <div className="flex flex-wrap gap-2">
          {WHEN.map((w) => (
            <button key={w.id} type="button" className="chip" aria-pressed={when === w.id} onClick={() => setWhen(w.id)}>
              {w.label}
            </button>
          ))}
          <span className="mx-1 w-px self-stretch bg-line" aria-hidden="true" />
          {COST.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cost === c.id} onClick={() => setCost(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {topInterests.map((i) => (
            <button key={i} type="button" className="chip" aria-pressed={interest === i} onClick={() => setInterest(interest === i ? null : i)}>
              {interestById[i].label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 mb-3 text-sm font-semibold text-muted" aria-live="polite">
        {list.length} {list.length === 1 ? "event" : "events"}
      </p>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      ) : (
        <Empty>
          Nothing matches those filters.{" "}
          <button
            type="button"
            className="link"
            onClick={() => {
              setWhen("all");
              setCost("all");
              setInterest(null);
            }}
          >
            Clear filters
          </button>
        </Empty>
      )}
    </div>
  );
}
