"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, type KeyboardEvent } from "react";
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
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const me = useDemo((st) => st.me);
  const hosted = useDemo((st) => st.hosted);
  const itineraries = useDemo((st) => st.itineraries);
  const deck = useDeck(vibe);
  const weekEvents = allEvents(hosted).filter((e) => e.dayOffset < 7).length;

  const go = (id: TabId, focus = false) => {
    const keep = vibe ? `&vibe=${encodeURIComponent(vibe)}` : "";
    router.replace(`${pathname}?tab=${id}${keep}`, { scroll: false });
    if (focus) tabRefs.current[id]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: TABS.length - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    go(TABS[(next + TABS.length) % TABS.length].id, true);
  };
  const jump = (id: TabId) => {
    go(id);
    document
      .getElementById("club-tabs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
        <span className={s.sunDisc} aria-hidden="true" />
        <Ridges />
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
        </div>
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
      </header>

      <div
        id="club-tabs"
        className={s.tabs}
        role="tablist"
        aria-label="Vibers Club"
        onKeyDown={onKey}
        style={{ scrollMarginTop: 10 }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={s.tab}
            onClick={() => go(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        key={tab}
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className={s.panel}
      >
        {tab === "events" && <Events />}
        {tab === "community" && <Community vibe={vibe} />}
        {tab === "explore" && <Explore />}
        {tab === "itinerary" && <Itinerary />}
        {tab === "post" && <PostTab onSeeCommunity={() => jump("community")} />}
      </div>
    </div>
  );
}
