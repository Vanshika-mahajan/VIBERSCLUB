"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HomeSections } from "@/features/home/HomeSections";
import { places } from "@/lib/demo/data";
import { useDemo } from "@/lib/demo/store";
import { allEvents } from "@/lib/demo/people";
import { PostTab } from "./PostTab";
import { useDeck } from "./shared";
import s from "./club.module.css";

/** Solang, above Manali: the hero photograph (ridges and dusk show if it can't load) */
const HERO_PHOTO =
  places.find((p) => p.id === "solang")?.photoUrl?.replace("w=640", "w=1600") ??
  "";

/** The soft ridges at the foot of the hero, in the palette, far to near */
function Ridges() {
  return (
    <svg
      className={s.ridges}
      viewBox="0 0 1200 190"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 120 L120 70 L210 104 L330 38 L450 96 L560 52 L690 110 L820 46 L940 92 L1060 58 L1200 98 V190 H0Z"
        style={{ fill: "var(--color-plum)" }}
        opacity="0.55"
      />
      <path
        d="M0 150 L140 104 L250 132 L380 86 L520 140 L640 98 L780 142 L900 104 L1040 136 L1200 112 V190 H0Z"
        style={{ fill: "var(--color-leaf)" }}
        opacity="0.6"
      />
      <path
        d="M0 170 L160 138 L300 160 L460 128 L600 166 L760 136 L900 168 L1060 140 L1200 160 V190 H0Z"
        style={{ fill: "var(--color-moss)" }}
        opacity="0.95"
      />
      <path
        d="M0 182 C200 168 400 186 600 176 S1000 170 1200 180 V190 H0Z"
        style={{ fill: "var(--color-ivy)" }}
        opacity="0.95"
      />
    </svg>
  );
}

/**
 * The club home: a hero that says where you are and what's waiting, then one page of what matters
 * today: your vibe and requests, a quick post, Vibers like you, what's on this week and day plans.
 * Discover and Explore have their own pages in the pill bar.
 */
export function ClubHome() {
  const router = useRouter();
  const me = useDemo((st) => st.me);
  const hosted = useDemo((st) => st.hosted);
  const itineraries = useDemo((st) => st.itineraries);
  const deck = useDeck();
  const weekEvents = allEvents(hosted).filter((e) => e.dayOffset < 7).length;
  const [heroPhoto, setHeroPhoto] = useState(true);

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
      <header className={s.hero}>
        <Ridges />
        {heroPhoto && (
          // eslint-disable-next-line @next/next/no-img-element -- sample photo from a CDN
          <img
            className={s.heroPhoto}
            src={HERO_PHOTO}
            alt=""
            onError={() => setHeroPhoto(false)}
            ref={(el) => {
              if (el?.complete && el.naturalWidth === 0) setHeroPhoto(false);
            }}
          />
        )}
        <div className={s.heroShade} aria-hidden="true" />
        <div className={s.heroInner}>
          <p className={s.kicker}>
            <span className={s.kickerDot} aria-hidden="true" /> Manali ·{" "}
            {me.status === "local" ? "Local" : "Visiting"}
          </p>
          <h1 className={s.title}>
            Hi {me.name}, your Manali has <em>people</em> in it.
          </h1>
          <p className={s.sly}>Travel solo. Just not alone.</p>
          <p className={s.lede}>
            Meet Vibers who share your vibe, join what&apos;s on, find places
            worth the walk and plan your days, all in one place.
          </p>
          <div className={s.stats}>
            {stats.map((st) => (
              <Link key={st.label} href={st.href} className={s.stat}>
                <span className={s.statNum}>{st.n}</span>
                <span className={s.statLabel}>{st.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      <HomeSections
        post={<PostTab onSeeCommunity={() => router.push("/discover")} />}
      />
    </div>
  );
}
