"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { HealthStatus } from "@/components/HealthStatus";
import { HomeSections, type HomePart } from "@/features/home/HomeSections";
import { HomeMore, type MorePart } from "@/features/home/HomeMore";
import { homeTabs, isHomeTab, OPEN_TAB, type HomeTabId } from "./sections";
import t from "./tabs.module.css";

const TOP = 68; // the height of the top line (wordmark, + Post, your initial)
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Home after the opening: the opening scrolls down to Your vibe, and there the page stops being one
 * long issue. A row of tabs, one per chapter, sticks under the top line and shows one chapter at a
 * time; each chapter after Your vibe opens on one of ARPIT's clips, and ends with tiles leading to
 * the others. The open tab is kept in the address (#events), so old links into Home still land.
 * Once the tabs are in view the docked contents step aside, as the tabs take their place.
 */
export function HomeTabs({ post }: { post?: ReactNode }) {
  const [active, setActive] = useState<HomeTabId>("your-vibe");
  const area = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  // bring the row of tabs to the top of the screen, under the top line
  const toTabs = useCallback((smooth = true) => {
    const el = area.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - TOP;
    if (Math.abs(scrollY - y) < 2) return;
    scrollTo({ top: y, behavior: smooth && !reduced() ? "smooth" : "auto" });
  }, []);

  const open = useCallback(
    (id: HomeTabId, scroll = true) => {
      setActive(id);
      history.replaceState(null, "", `#${id}`);
      if (scroll) toTabs();
    },
    [toTabs],
  );

  // a link with a chapter in the address (/home#events), and the contents asking for a chapter
  useEffect(() => {
    const fromHash = () => {
      const id = location.hash.slice(1);
      if (isHomeTab(id)) {
        setActive(id);
        if (id !== "your-vibe") requestAnimationFrame(() => toTabs(false));
      }
    };
    fromHash();
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (isHomeTab(id)) open(id);
    };
    addEventListener("hashchange", fromHash);
    addEventListener(OPEN_TAB, onOpen);
    return () => {
      removeEventListener("hashchange", fromHash);
      removeEventListener(OPEN_TAB, onOpen);
    };
  }, [open, toTabs]);

  // the docked contents step aside once the tabs are in view (they list the same chapters), and the
  // top line turns to paper once the row of tabs reaches it
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const check = () => {
      raf = 0;
      const top = area.current?.getBoundingClientRect().top ?? Infinity;
      // "stuck": the row is up under the top line, which then takes the paper too
      root.dataset.homeTabs = top <= TOP + 1 ? "stuck" : top < innerHeight * 0.55 ? "on" : "off";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      delete root.dataset.homeTabs;
    };
  }, []);

  // the open tab stays in view in the row (on a phone the row scrolls sideways)
  useEffect(() => {
    const row = bar.current;
    const tab = row?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!row || !tab) return;
    const left = tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2;
    row.scrollTo({ left, behavior: reduced() ? "auto" : "smooth" });
  }, [active]);

  // arrow keys move along the row, as in any set of tabs
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = homeTabs.findIndex((x) => x.id === active);
    const to =
      e.key === "ArrowRight" ? (i + 1) % homeTabs.length
      : e.key === "ArrowLeft" ? (i - 1 + homeTabs.length) % homeTabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? homeTabs.length - 1
      : -1;
    if (to < 0) return;
    e.preventDefault();
    open(homeTabs[to].id, false);
    bar.current?.querySelector<HTMLElement>(`[data-tab="${homeTabs[to].id}"]`)?.focus();
  };

  const opener = (id: HomePart | MorePart) => <TabOpener id={id} />;
  const more = homeTabs.filter((x) => x.id !== active);

  return (
    <div ref={area} className={`vc-bleed ${t.area}`} data-tabs-area="">
      <div ref={bar} className={t.bar} role="tablist" aria-label="Chapters of Home" onKeyDown={onKey}>
        {homeTabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`tab-${x.id}`}
            data-tab={x.id}
            aria-selected={x.id === active}
            aria-controls="home-tab-panel"
            tabIndex={x.id === active ? 0 : -1}
            className={t.tab}
            onClick={() => open(x.id)}
          >
            <i className={t.tabN} aria-hidden="true">
              {x.n}
            </i>
            {x.label}
          </button>
        ))}
      </div>

      <div key={active} id="home-tab-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className={t.panel}>
        {active === "discover" || active === "events" || active === "explore" ? (
          <HomeMore only={active} opener={opener} />
        ) : (
          <HomeSections only={active} post={post} opener={opener} />
        )}

        <nav aria-label="More in the club" className={t.more}>
          <p className="kicker">More in the club</p>
          <ul className={t.tiles}>
            {more.map((x) => (
              <li key={x.id}>
                <a
                  href={`#${x.id}`}
                  className={t.tile}
                  onClick={(e) => {
                    e.preventDefault();
                    open(x.id);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small still of the chapter's clip */}
                  <img src={x.poster} alt="" className={t.tileImg} loading="lazy" />
                  <span className={t.tileText}>
                    <i aria-hidden="true">{x.n}</i>
                    <b>{x.label}</b>
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-ink pt-4 text-sm text-muted">
          <span>Design preview: everyone here is a fictional sample Viber. </span>
          <span className="flex items-center gap-2">
            <span className="kicker">System status</span> <HealthStatus />
          </span>
        </footer>
      </div>
    </div>
  );
}

/** a chapter's opener: its clip looping edge to edge, the title over it and its numeral */
function TabOpener({ id }: { id: HomeTabId }) {
  const tab = homeTabs.find((x) => x.id === id)!;
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (reduced()) {
      v.pause();
      return;
    }
    // plays only while on screen, so a clip scrolled away costs nothing
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <div className={t.opener} data-tone="dark">
      {"video" in tab && (
        <video ref={video} className={t.video} src={tab.video} poster={tab.poster} muted loop playsInline preload="auto" aria-hidden="true" />
      )}
      <span className={t.shade} aria-hidden="true" />
      <span className={t.n} aria-hidden="true">
        {tab.n}
      </span>
      <h2 className={t.title}>{tab.label}</h2>
    </div>
  );
}
