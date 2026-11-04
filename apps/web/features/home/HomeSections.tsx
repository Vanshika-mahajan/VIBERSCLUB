"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import CircularCarousel from "@/components/reactbits/CircularCarousel";
import { portrait } from "@/features/club/shared";
import { HealthStatus } from "@/components/HealthStatus";
import { Section } from "@/components/ui";
import { EventCard } from "@/features/events/EventCard";
import { hashtag, interpret } from "@/features/discover/interpret";
import { discover } from "@/features/discover/rank";
import { roadmaps, places } from "@/lib/demo/data";
import { allEvents, vibers } from "@/lib/demo/people";
import { useDemo } from "@/lib/demo/store";
import { areas, interestById } from "@/lib/taxonomy";

const noop = () => () => {};

/**
 * What used to be the Today page, now the body of Home under the hero: your vibe and requests, a quick
 * post, Vibers like you, what's on this week, day plans and the system status.
 */
export function HomeSections({ post }: { post?: ReactNode }) {
  const me = useDemo((s) => s.me);
  const hosted = useDemo((s) => s.hosted);
  const connections = useDemo((s) => s.connections);
  const blocked = useDemo((s) => s.blocked);
  const requests = Object.entries(connections).filter(([, c]) => c === "incoming").length;

  // Vibers like you: the same ranking as Discover, run on your own vibe and interests
  const likeYou = useMemo(() => {
    const t = interpret(me.vibe, { added: me.interests, removed: [] });
    return discover(t, vibers.filter((v) => !blocked.includes(v.id)), 10).matches.slice(0, 10);
  }, [me, blocked]);
  // the ring is drawn in the browser only (its fallback portraits are drawn on a canvas)
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const ring = useMemo(
    () =>
      mounted
        ? likeYou.map((m) => ({
            src: m.viber.photoUrl || portrait(m.viber.name),
            fallback: portrait(m.viber.name),
            alt: m.viber.name,
            title: m.viber.name,
            subtitle: m.shared.slice(0, 2).join(" · ") || areas[m.viber.area].label,
          }))
        : [],
    [likeYou, mounted],
  );
  const upcoming = useMemo(() => {
    const mine = new Set(me.interests);
    return allEvents(hosted)
      .filter((e) => e.dayOffset <= 6)
      .sort((a, b) => b.interests.filter((i) => mine.has(i)).length - a.interests.filter((i) => mine.has(i)).length || a.dayOffset - b.dayOffset)
      .slice(0, 3);
  }, [me.interests, hosted]);

  return (
    <div className="pt-10">
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
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

      {post && <div id="post" className="mt-10 scroll-mt-6">{post}</div>}

      <Section title="Vibers like you" action={<Link href="/discover" className="link text-sm">Discover</Link>}>
        {/* relevant profiles on a slowly turning ring: drag to spin, click one to bring it to the front */}
        <div className="relative -mx-4 h-[380px] md:mx-0 md:h-[440px]">
          {ring.length > 0 && (
            <CircularCarousel
              items={ring}
              ariaLabel="Vibers like you"
              preset="cylinder"
              intro="rise"
              cardWidth={190}
              aspectRatio={0.78}
              gap={22}
              speed={9}
              depthFade={0.6}
              fadeColor="#1f0c11"
              innerShade={0.35}
              cornerRadius={18}
              captions
            />
          )}
        </div>
        <ul className="sr-only">
          {likeYou.map((m) => (
            <li key={m.viber.id}>
              {m.viber.name}, {areas[m.viber.area].label}. You share {m.shared.join(", ")}.
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
            <Link key={r.id} href={`/explore#${r.id}`} className="card block p-4 transition hover:border-rose/30 hover:shadow-soft">
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
