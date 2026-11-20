"use client";

import { openPost } from "@/components/PostButton";
import s from "@/features/club/club.module.css";
import { Opening } from "@/features/home/Opening";
import { HomeTabs } from "./HomeTabs";

/** Home with tabs: the same opening (now with a line to scroll), then the tabs from Your vibe on */
export function HomeTabsDemo() {
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
