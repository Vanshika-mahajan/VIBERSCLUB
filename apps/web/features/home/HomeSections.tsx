"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import CircularCarousel from "@/components/reactbits/CircularCarousel";
import { portrait } from "@/features/club/shared";
import { HealthStatus } from "@/components/HealthStatus";
import { Section } from "@/components/ui";
import { Chapter } from "./Chapter";
import { EventCard } from "@/features/events/EventCard";
import { hashtag, interpret } from "@/features/discover/interpret";
import { discover } from "@/features/discover/rank";
import { roadmaps, places } from "@/lib/demo/data";
import { allEvents, vibers } from "@/lib/demo/people";
import { useDemo } from "@/lib/demo/store";
import { areas, interestById } from "@/lib/taxonomy";

const noop = () => () => {};

/**
 * The body of Home under the opening, in the chapters the contents list: I your vibe and requests
 * (its title is the last frame of the opening), a quick post, II Vibers like you, III this week and
 * IV day plans, each opening on a photograph that gathers out of stardust; then the system status.
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
    <div>
      <section id="your-vibe" aria-label="Your vibe" data-tone="dark" className="vc-panel vc-panel--espresso scroll-mt-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr] md:gap-14">
          <div aria-labelledby="vibe-title">
            <p className="kicker" id="vibe-title">
              In your words
            </p>
            <p className="mt-3 font-display text-[1.6rem] leading-[1.05] font-semibold tracking-[-0.025em] text-ink md:text-[2.1rem]">
              &ldquo;{me.vibe}&rdquo;
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {me.interests.map((i) => (
                <span key={i} className="chip">
                  {hashtag(interestById[i].label)}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/discover" className="btn btn-accent">
                Find people like this <span className="arrow" aria-hidden="true">→</span>
              </Link>
              <Link href="/profile" className="btn-ghost">
                Edit vibe
              </Link>
            </div>
          </div>
          <section className="flex flex-col justify-between border-t border-line2 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-8">
            <div>
              <p className="kicker">Connections</p>
              <p className="mt-3 text-lg font-medium text-ink">
                {requests > 0 ? `${requests} ${requests === 1 ? "person wants" : "people want"} to connect` : "No new requests"}
              </p>
              <p className="mt-1 text-sm text-muted">Chats open only when you both say yes.</p>
            </div>
            <Link href="/chats" className="link mt-6 self-start text-sm">
              Open chats <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </section>

      {post && <div id="post" className="mt-16 scroll-mt-6">{post}</div>}

      <Section id="vibers-like-you" title="Vibers like you" opener={<Chapter n="II" title="Vibers like you" img="/home/chapter-vibers.webp" y={0.5} />} action={<Link href="/discover" className="link text-sm">Discover <span className="arrow" aria-hidden="true">→</span></Link>}>
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
              fadeColor="#f7f2e8"
              innerShade={0.35}
              cornerRadius={2}
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

      <Section id="this-week" title="This week" opener={<Chapter n="III" title="This week" img="/home/chapter-this-week.webp" y={0.45} />} action={<Link href="/events" className="link text-sm">All events <span className="arrow" aria-hidden="true">→</span></Link>}>
        {/* asymmetric: the closest match leads, larger; the next two stack beside it */}
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:gap-10">
          {upcoming.map((e, i) => (
            <div key={e.id} className={i === 0 ? "md:row-span-2" : ""}>
              <EventCard e={e} compact={i > 0} lead={i === 0} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="day-plans" title="Day plans" opener={<Chapter n="IV" title="Day plans" img="/home/chapter-day-plans.webp" y={0.5} />} action={<Link href="/explore" className="link text-sm">Places <span className="arrow" aria-hidden="true">→</span></Link>}>
        <div className="vc-panel vc-panel--olive" data-tone="dark">
        <ol className="border-t border-line2">
          {roadmaps.map((r, i) => (
            <li key={r.id} className="border-b border-line2">
              <Link href={`/explore#${r.id}`} className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-4 py-5 md:grid-cols-[4rem_minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center md:gap-8">
                <span className="vc-num font-display text-lg font-bold">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b className="block font-display text-xl leading-tight font-bold tracking-[-0.02em] md:text-2xl">{r.title}</b>
                  <small className="text-sm text-muted">{r.summary}</small>
                </span>
                <span className="hidden text-sm text-ink2 md:block">{r.stops.map((s) => places.find((p) => p.id === s.placeId)?.name).join(" → ")}</span>
                <span className="vc-go" aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ol>
        </div>
      </Section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-ink pt-4 text-sm text-muted">
        <span>Design preview: everyone here is a fictional sample Viber. </span>
        <span className="flex items-center gap-2">
          <span className="kicker">System status</span> <HealthStatus />
        </span>
      </footer>
    </div>
  );
}
