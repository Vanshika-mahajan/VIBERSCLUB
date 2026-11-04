"use client";

import { useMemo, useState, type ReactNode } from "react";
import { interpret } from "@/features/discover/interpret";
import { discover } from "@/features/discover/rank";
import type { Thought } from "@/features/discover/types";
import { initials } from "@/features/discover/sphere";
import { samplePosts, type Post } from "@/lib/demo/club";
import { useDemo } from "@/lib/demo/store";
import { vibers } from "@/lib/demo/people";
import s from "./club.module.css";

/** an image that failed before React hydrated never fires onError, so check it on attach too */
const checkBroken = (fail: () => void) => (el: HTMLImageElement | null) => {
  if (el?.complete && el.naturalWidth === 0) fail();
};

/** A photo on the palette's olive-to-blush wash; initials (or nothing) when it is missing or fails. */
export function Photo({
  src,
  name,
  className = "",
  position,
  children,
}: {
  src?: string;
  name?: string;
  className?: string;
  position?: string;
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${s.photo} ${className}`}>
      {name && (
        <span className={s.initials} aria-hidden="true">
          {initials(name)}
        </span>
      )}
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- sample photos from a CDN; real photos come from Storage
        <img
          src={src}
          alt=""
          draggable={false}
          style={position ? { objectPosition: position } : undefined}
          ref={checkBroken(() => setFailed(true))}
          onError={() => setFailed(true)}
        />
      )}
      {children}
    </div>
  );
}

export function SampleTag() {
  return <span className={s.sample}>Sample</span>;
}

/** "2 h ago" */
export function ago(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 60 * 24) return `${Math.round(min / 60)} h ago`;
  return `${Math.round(min / 60 / 24)} d ago`;
}

const unique = <T,>(xs: T[]) => [...new Set(xs)];

/**
 * What the club knows about my vibe: my profile line and interests, plus everything I have posted.
 * Posting is how a Viber tells the club what they are into right now, so posts feed every match.
 */
export function useMyThought(): Thought {
  const me = useDemo((st) => st.me);
  const posts = useDemo((st) => st.posts);
  return useMemo(() => {
    const t = interpret([me.vibe, ...posts.map((p) => p.text)].join(". "));
    return {
      ...t,
      interests: unique([...t.interests, ...me.interests]).filter(
        (i) => !t.excluded.includes(i),
      ),
      intents: unique([...t.intents, ...me.intents]),
      area: t.area ?? me.area,
    };
  }, [me, posts]);
}

/**
 * Vibers ranked for me, without anyone I've already liked, passed, saved or blocked. `vibe` is what
 * I typed at the door: when it names something, it leads the ranking over my profile.
 */
export function useDeck(vibe = "") {
  const mine = useMyThought();
  const thought = useMemo(() => {
    const t = vibe.trim() ? interpret(vibe) : null;
    if (!t || !t.interests.length) return mine;
    return {
      ...t,
      intents: t.intents.length ? t.intents : mine.intents,
      area: t.area ?? mine.area,
    };
  }, [vibe, mine]);
  const liked = useDemo((st) => st.liked);
  const passed = useDemo((st) => st.passed);
  const saved = useDemo((st) => st.saved);
  const blocked = useDemo((st) => st.blocked);
  return useMemo(() => {
    const seen = new Set([...liked, ...passed, ...saved, ...blocked]);
    return discover(thought, vibers, 7).matches.filter(
      (m) => !seen.has(m.viber.id),
    );
  }, [thought, liked, passed, saved, blocked]);
}

/** posts from everyone, newest first, mine included */
export function useAllPosts(): Post[] {
  const mine = useDemo((st) => st.posts);
  return useMemo(
    () => [...mine, ...samplePosts].sort((a, b) => a.minutesAgo - b.minutesAgo),
    [mine],
  );
}

export function Icon({
  name,
  size = 20,
}: {
  name:
    | "heart"
    | "x"
    | "bookmark"
    | "plus"
    | "trash"
    | "pin"
    | "calendar"
    | "send"
    | "spark";
  size?: number;
}) {
  const p = {
    heart:
      "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z",
    x: "M6 6l12 12M18 6 6 18",
    bookmark: "M7 4h10v16l-5-3.6L7 20Z",
    plus: "M12 5v14M5 12h14",
    trash: "M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12",
    pin: "M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21Zm0-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    calendar: "M5 6h14v14H5zM5 10h14M9 4v4M15 4v4",
    send: "M4 12 20 4l-6 16-2.5-6.5Z",
    spark:
      "M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3",
  }[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={p} />
    </svg>
  );
}
