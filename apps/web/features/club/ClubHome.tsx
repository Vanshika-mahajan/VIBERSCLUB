"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HomeSections } from "@/features/home/HomeSections";
import { places } from "@/lib/demo/data";
import { openPost } from "@/components/PostButton";
import { useDemo } from "@/lib/demo/store";
import { allEvents } from "@/lib/demo/people";
import { useDeck } from "./shared";
import s from "./club.module.css";

const noop = () => () => {};

/** Solang, above Manali: the hero photograph. A placeholder: any wide photo drops into the same frame. */
const HERO_PHOTO =
  places.find((p) => p.id === "solang")?.photoUrl?.replace("w=640", "w=2000") ??
  "";
/** shown when the photograph can't load: our own meadow scene, toned the same way */
const HERO_FALLBACK = "/journey/day.webp";

/** slow parallax: the photograph drifts a little slower than the page (off with reduced motion) */
function useParallax() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.parentElement!.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      el.style.setProperty("--drift", `${Math.round(-r.top * 0.16)}px`);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    addEventListener("scroll", on, { passive: true });
    return () => {
      removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

const dateLine = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

/**
 * The club home, set like the cover of a magazine: a masthead line, the headline layered over a
 * full-bleed photograph, a standfirst with one restrained call to action, then the numbered sections
 * of the issue (your vibe, Vibers like you, what's on, day plans).
 */
export function ClubHome() {
  const me = useDemo((st) => st.me);
  const hosted = useDemo((st) => st.hosted);
  const itineraries = useDemo((st) => st.itineraries);
  const deck = useDeck();
  const weekEvents = allEvents(hosted).filter((e) => e.dayOffset < 7).length;
  const [heroPhoto, setHeroPhoto] = useState(true);
  const drift = useParallax();
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  const stats: { href: string; n: number; label: string }[] = [
    { href: "/discover", n: deck.length, label: "Vibers like you" },
    { href: "/events", n: weekEvents, label: "Events this week" },
    { href: "/explore", n: places.length, label: "Places to explore" },
    {
      href: "/explore?section=itinerary",
      n: itineraries.length,
      label: itineraries.length === 1 ? "Plan of yours" : "Plans of yours",
    },
  ];

  return (
    <div className={s.club}>
      <header className={s.cover}>
        <div className={s.coverMast}>
          <p className={s.kicker}>
            <span className={s.kickerDot} aria-hidden="true" /> Manali ·{" "}
            {me.status === "local" ? "Local" : "Visiting"}
          </p>
          <p className={`${s.kicker} ${s.coverDate}`}>{mounted ? dateLine.format(new Date()) : "This week"}</p>
        </div>
        <h1 className={s.coverTitle}>
          <span className={s.coverLine}>Spaces for</span>{" "}
          <span className={`${s.coverLine} ${s.coverOver}`}>curious people.</span>
        </h1>
        <div className={s.coverFrame}>
          <div className={s.coverPhoto} ref={drift}>
            {/* eslint-disable-next-line @next/next/no-img-element -- sample photo from a CDN, a placeholder */}
            <img
              src={heroPhoto ? HERO_PHOTO : HERO_FALLBACK}
              alt=""
              onError={() => setHeroPhoto(false)}
              ref={(el) => {
                if (heroPhoto && el?.complete && el.naturalWidth === 0) setHeroPhoto(false);
              }}
            />
          </div>
          <p className={s.coverCoords} aria-hidden="true">
            Solang, Manali
            <br />
            32.32° N · 77.16° E
          </p>
          <p className={s.coverCaption} aria-hidden="true">
            Issue 01 · The valley
          </p>
        </div>
        <div className={s.standfirst}>
          <p className={s.sly}>Hi {me.name}. Travel solo, just not alone.</p>
          <div className={s.standBody}>
            <p className={s.lede}>
              Meet Vibers who share your vibe, join what&apos;s on, find places worth the walk and
              plan your days, all in one place.
            </p>
            <div className={s.ctaRow}>
              <Link href="/discover" className={s.lineCta}>
                Find your people <span className="arrow" aria-hidden="true">→</span>
              </Link>
              <Link href="/events" className={s.quietCta}>
                What&apos;s on this week
              </Link>
            </div>
          </div>
        </div>
        <div className={s.stats}>
          {stats.map((st) => (
            <Link key={st.label} href={st.href} className={s.stat}>
              <span className={s.statNum}>{String(st.n).padStart(2, "0")}</span>
              <span className={s.statLabel}>{st.label}</span>
            </Link>
          ))}
        </div>
      </header>

      <HomeSections
        post={
          <button type="button" className={s.ignite} onClick={openPost}>
            <span>
              <span className={s.igniteTitle}>Ignite the vibe</span>
              <span className={`${s.muted} ${s.small}`}>
                Post a thread or a photo. Its keywords find your people.
              </span>
            </span>
            <span className={s.igniteGo} aria-hidden="true">
              Post <span className="arrow">→</span>
            </span>
          </button>
        }
      />
    </div>
  );
}
