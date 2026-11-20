"use client";

import { Suspense, type ReactNode } from "react";
import { Events } from "@/features/club/Events";
import { CommunityFromDoor } from "@/features/club/MovedTabs";
import s from "@/features/club/club.module.css";
import { DiscoverScreen } from "@/features/discover/DiscoverScreen";
import { ExploreHub } from "@/features/explore/ExploreHub";
import { Chapter } from "./Chapter";

/**
 * Chapters V to VII of Home: the whole of Discover (the thought sphere and the faces under it), Events
 * and Explore, so the club reads as one issue you can scroll through. Each still has its own page
 * (/discover, /events, /explore) for links from elsewhere.
 */
export type MorePart = "discover" | "events" | "explore";

export function HomeMore({
  only,
  opener,
}: {
  /** just this chapter (Home's tabs) */
  only?: MorePart;
  /** draws a chapter's opener in place of its illustration */
  opener?: (id: MorePart, n: string, title: string) => ReactNode;
} = {}) {
  const show = (id: MorePart) => !only || only === id;
  const open = (id: MorePart, n: string, title: string, img: string, y: number) =>
    opener ? opener(id, n, title) : <Chapter n={n} title={title} img={img} y={y} />;
  return (
    <>
      {show("discover") && (
      <section
        id="discover"
        aria-label="Discover"
        className="mt-16 scroll-mt-4 md:mt-24"
      >
        {open("discover", "V", "Discover", "/home/chapter-discover.webp", 0.55)}
        <DiscoverScreen inline />
        <section
          id="community"
          aria-label="Community"
          className={`${s.club} ${s.night} scroll-mt-6 pt-10`}
        >
          {/* reads the URL (a vibe from the door), which needs a Suspense boundary for static rendering */}
          <Suspense>
            <CommunityFromDoor />
          </Suspense>
        </section>
      </section>
      )}

      {show("events") && (
      <section
        id="events"
        aria-label="Events"
        className={`${s.club} mt-16 scroll-mt-4 md:mt-24`}
      >
        {open("events", "VI", "Events", "/home/chapter-events.webp", 0.55)}
        <Events />
      </section>
      )}

      {show("explore") && (
      <section
        id="explore"
        aria-label="Explore"
        className="mt-16 scroll-mt-4 md:mt-24"
      >
        {open("explore", "VII", "Explore", "/home/chapter-explore.webp", 0.4)}
        <Suspense>
          <ExploreHub inline />
        </Suspense>
      </section>
      )}
    </>
  );
}
