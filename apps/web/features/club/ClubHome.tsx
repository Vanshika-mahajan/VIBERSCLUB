"use client";

import { HomeTabs } from "@/features/home/tabs/HomeTabs";
import { Opening } from "@/features/home/Opening";
import { openPost } from "@/components/PostButton";
import s from "./club.module.css";

/**
 * The club home: the opening (two Vibers reach for each other, a spark, the meadow breaks into
 * stardust and gathers into our Earth) scrolls down to Your vibe, with a line asking you to scroll.
 * From there a row of tabs, I to VII, shows one chapter at a time: Your vibe, Vibers like you, this
 * week, day plans, Discover, Events and Explore.
 */
export function ClubHome() {
  return (
    <div className={s.club}>
      <Opening line="Scroll to meet your vibe" />
      <HomeTabs
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
    </div>
  );
}
