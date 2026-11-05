"use client";

import { Suspense } from "react";
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
export function HomeMore() {
  return (
    <>
      <section
        id="discover"
        aria-label="Discover"
        className="mt-16 scroll-mt-4 md:mt-24"
      >
        <Chapter n="V" title="Discover" img="/home/earth.webp" y={0.5} />
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

      <section
        id="events"
        aria-label="Events"
        className={`${s.club} mt-16 scroll-mt-4 md:mt-24`}
      >
        <Chapter n="VI" title="Events" img="/journey/night.webp" y={0.45} />
        <Events />
      </section>

      <section
        id="explore"
        aria-label="Explore"
        className="mt-16 scroll-mt-4 md:mt-24"
      >
        <Chapter n="VII" title="Explore" img="/home/scene.webp" y={0.45} />
        <Suspense>
          <ExploreHub inline />
        </Suspense>
      </section>
    </>
  );
}
