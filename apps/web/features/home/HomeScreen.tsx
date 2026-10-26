"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HealthStatus } from "@/components/HealthStatus";
import { Avatar, Section } from "@/components/ui";
import { EventCard } from "@/features/events/EventCard";
import { hashtag, interpret } from "@/features/discover/interpret";
import { discover } from "@/features/discover/rank";
import { roadmaps, places } from "@/lib/demo/data";
import { allEvents, vibers } from "@/lib/demo/people";
import { useDemo } from "@/lib/demo/store";
import { areas, interestById } from "@/lib/taxonomy";

export function HomeScreen() {
  const me = useDemo((s) => s.me);
  const hosted = useDemo((s) => s.hosted);
  const connections = useDemo((s) => s.connections);
  const blocked = useDemo((s) => s.blocked);
  const requests = Object.entries(connections).filter(([, c]) => c === "incoming").length;

  // Vibers like you: the same ranking as Discover, run on your own vibe and interests
  const likeYou = useMemo(() => {
    const t = interpret(me.vibe, { added: me.interests, removed: [] });
    return discover(t, vibers.filter((v) => !blocked.includes(v.id)), 6).matches.slice(0, 6);
  }, [me, blocked]);
  const upcoming = useMemo(() => {
    const mine = new Set(me.interests);
    return allEvents(hosted)
      .filter((e) => e.dayOffset <= 6)
      .sort((a, b) => b.interests.filter((i) => mine.has(i)).length - a.interests.filter((i) => mine.has(i)).length || a.dayOffset - b.dayOffset)
      .slice(0, 3);
  }, [me.interests, hosted]);

  return (
    <div>
      <header className="space-y-2">
        <p className="kicker">Vibers Club · {areas[me.area].label}</p>
        <h1 className="display text-4xl md:text-5xl">
          Hi {me.name}, find your <span className="accent-word">people</span> in Manali.
        </h1>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <section className="card p-5" aria-labelledby="vibe-title">
          <p className="kicker" id="vibe-title">
            Your vibe
          </p>
          <p className="mt-2 text-lg font-semibold text-ink2">&ldquo;{me.vibe}&rdquo;</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {me.interests.map((i) => (
              <span key={i} className="chip">
                {hashtag(interestById[i].label)}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/discover" className="btn btn-accent">
              Find people like this
            </Link>
            <Link href="/profile" className="btn-ghost">
              Edit vibe
            </Link>
          </div>
        </section>
        <section className="card flex flex-col justify-between p-5">
          <div>
            <p className="kicker">Connections</p>
            <p className="mt-2 text-lg font-semibold">
              {requests > 0 ? `${requests} ${requests === 1 ? "person wants" : "people want"} to connect` : "No new requests"}
            </p>
            <p className="text-sm text-muted">Chats open only when you both say yes.</p>
          </div>
          <Link href="/chats" className="btn-ghost mt-4 self-start">
            Open chats
          </Link>
        </section>
      </div>

      <Section title="Vibers like you" action={<Link href="/discover" className="link text-sm">Discover</Link>}>
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0">
          {likeYou.map((m) => (
            <li key={m.viber.id} className="card flex w-64 shrink-0 items-center gap-3 p-3 md:w-auto">
              <Avatar name={m.viber.name} src={m.viber.photoUrl} size={52} />
              <span className="min-w-0">
                <b className="block truncate">{m.viber.name}</b>
                <small className="block truncate font-semibold text-accent">{m.shared.join(" · ")}</small>
                <small className="block truncate text-muted">{areas[m.viber.area].label}</small>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Happening this week" action={<Link href="/events" className="link text-sm">All events</Link>}>
        <div className="grid gap-4 md:grid-cols-3">
          {upcoming.map((e) => (
            <EventCard key={e.id} e={e} compact />
          ))}
        </div>
      </Section>

      <Section title="Explore Manali" action={<Link href="/explore" className="link text-sm">Places</Link>}>
        <div className="grid gap-3 md:grid-cols-3">
          {roadmaps.map((r) => (
            <Link key={r.id} href={`/explore#${r.id}`} className="card block p-4 transition hover:border-brand/30 hover:shadow-soft">
              <b className="block">{r.title}</b>
              <small className="text-muted">{r.summary}</small>
              <p className="mt-2 text-xs font-bold text-ink2">{r.stops.map((s) => places.find((p) => p.id === s.placeId)?.name).join(" → ")}</p>
            </Link>
          ))}
        </div>
      </Section>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm text-muted">
        <span>Design preview: everyone here is a fictional sample Viber. </span>
        <span className="flex items-center gap-2">
          <span className="kicker">System status</span> <HealthStatus />
        </span>
      </footer>
    </div>
  );
}
