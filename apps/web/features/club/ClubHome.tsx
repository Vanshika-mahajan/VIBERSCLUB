"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import OptionWheel from "@/components/reactbits/OptionWheel";
import { places } from "@/lib/demo/data";
import { useDemo } from "@/lib/demo/store";
import { allEvents } from "@/lib/demo/people";
import { Community } from "./Community";
import { Events } from "./Events";
import { Explore } from "./Explore";
import { Itinerary } from "./Itinerary";
import { PostTab } from "./PostTab";
import { useDeck } from "./shared";
import s from "./club.module.css";

export const TABS = [
  { id: "events", label: "Events" },
  { id: "community", label: "Community" },
  { id: "explore", label: "Explore" },
  { id: "itinerary", label: "My itinerary" },
  { id: "post", label: "Post" },
] as const;
export type TabId = (typeof TABS)[number]["id"];
const isTab = (x: string | null): x is TabId => TABS.some((t) => t.id === x);

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
 * The club home: a hero that says where you are and what's waiting, then five tabs: Events,
 * Community (swipe), Explore (places and similar posts), My itinerary and Post. The open tab lives in
 * the URL (?tab=), so links can open a tab and Back works.
 */
export function ClubHome() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("tab");
  const tab: TabId = isTab(q) ? q : "events";
  // what was typed at the door, if the journey brought us here
  const vibe = (params.get("vibe") ?? "").slice(0, 200);

  const me = useDemo((st) => st.me);
  const hosted = useDemo((st) => st.hosted);
  const itineraries = useDemo((st) => st.itineraries);
  const deck = useDeck(vibe);
  const weekEvents = allEvents(hosted).filter((e) => e.dayOffset < 7).length;

  const go = (id: TabId) => {
    const keep = vibe ? `&vibe=${encodeURIComponent(vibe)}` : "";
    router.replace(`${pathname}?tab=${id}${keep}`, { scroll: false });
  };
  // the wheel reports every option it passes; open the tab it comes to rest on
  const settle = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(settle.current), []);
  const onWheel = (index: number) => {
    window.clearTimeout(settle.current);
    const id = TABS[index].id;
    settle.current = window.setTimeout(() => id !== tab && go(id), 220);
  };
  const jump = (id: TabId) => {
    go(id);
    document
      .getElementById("club-content")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [heroPhoto, setHeroPhoto] = useState(true);
  const tabIndex = TABS.findIndex((t) => t.id === tab);

  const stats: { id: TabId; n: number; label: string }[] = [
    { id: "community", n: deck.length, label: "Vibers like you" },
    { id: "events", n: weekEvents, label: "Events this week" },
    { id: "explore", n: places.length, label: "Places to explore" },
    {
      id: "itinerary",
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
        <div className={s.heroGrid}>
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
                <button
                  key={st.id}
                  type="button"
                  className={s.stat}
                  onClick={() => jump(st.id)}
                >
                  <span className={s.statNum}>{st.n}</span>
                  <span className={s.statLabel}>{st.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* the five rooms of the club, on a wheel: scroll, drag, click or use the arrow keys */}
          <nav className={s.wheel} aria-label="Club sections">
            <OptionWheel
              id="club-tabs"
              ariaLabel="Vibers Club sections"
              items={TABS.map((t) => t.label)}
              defaultSelected={tabIndex}
              selected={tabIndex}
              onChange={onWheel}
              side="right"
              fontSize={2.1}
              spacing={1.5}
              curve={1}
              tilt={9}
              blur={1.2}
              fade={0.28}
              minOpacity={0.12}
              smoothing={180}
              inset={8}
              textColor="rgba(243, 235, 221, 0.42)"
              activeColor="#f3ebdd"
              className={s.wheelInner}
            />
          </nav>
        </div>
      </header>

      <section
        key={tab}
        id="club-content"
        aria-label={TABS[tabIndex].label}
        className={s.panel}
      >
        {tab === "events" && <Events />}
        {tab === "community" && <Community vibe={vibe} />}
        {tab === "explore" && <Explore />}
        {tab === "itinerary" && <Itinerary />}
        {tab === "post" && <PostTab onSeeCommunity={() => jump("community")} />}
      </section>
    </div>
  );
}
