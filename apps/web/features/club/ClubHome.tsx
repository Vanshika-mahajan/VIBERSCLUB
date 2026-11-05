"use client";

import { HomeSections } from "@/features/home/HomeSections";
import { HomeMore } from "@/features/home/HomeMore";
import { Opening } from "@/features/home/Opening";
import { openPost } from "@/components/PostButton";
import s from "./club.module.css";

/**
 * The club home, set like an edition of a magazine: the opening (two matching thoughts meet, a spark,
 * the meadow breaks into stardust and gathers into our Earth) under the contents, then the chapters
 * the contents list: your vibe, Vibers like you, this week and day plans, then the whole of Discover,
 * Events and Explore.
 */
export function ClubHome() {
  return (
    <div className={s.club}>
      <Opening />
      <HomeSections
        post={
          <button type="button" className={s.ignite} onClick={openPost}>
            <span>
              <span className={s.igniteTitle}>Ignite the vibe</span>
              <span className={`${s.muted} ${s.small}`}>Post a thread or a photo. Its keywords find your people.</span>
            </span>
            <span className={s.igniteGo} aria-hidden="true">
              Post <span className="arrow">→</span>
            </span>
          </button>
        }
      />
      <HomeMore />
    </div>
  );
}
