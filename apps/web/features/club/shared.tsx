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

const portraits = new Map<string, string>();
/**
 * A drawn portrait for a Viber without a usable photo, for the WebGL galleries (which need an image):
 * initials in the serif on a wine or forest ground. Browser only; empty on the server.
 */
export function portrait(name: string): string {
  if (typeof document === "undefined") return "";
  const hit = portraits.get(name);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 780;
  const g = c.getContext("2d");
  if (!g) return "";
  const forest =
    [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 2 === 0;
  const ground = g.createLinearGradient(0, 0, 600, 780);
  ground.addColorStop(0, forest ? "#f5f0c9" : "#fff3b0");
  ground.addColorStop(1, forest ? "#e4daee" : "#f2eac0");
  g.fillStyle = ground;
  g.fillRect(0, 0, 600, 780);
  const light = g.createRadialGradient(430, 170, 10, 430, 170, 430);
  light.addColorStop(0, "rgba(155, 130, 181, 0.22)");
  light.addColorStop(1, "rgba(155, 130, 181, 0)");
  g.fillStyle = light;
  g.fillRect(0, 0, 600, 780);
  g.fillStyle = "rgba(50, 11, 53, 0.82)";
  g.font = 'italic 300 190px "Fraunces Variable", Georgia, serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(initials(name), 300, 400);
  const url = c.toDataURL("image/jpeg", 0.88);
  portraits.set(name, url);
  return url;
}

/**
 * A drawn valley for a place or plan without a usable photo: ridges in the palette under a dusk sky,
 * varied by the name. Browser only; empty on the server.
 */
export function landscape(name: string): string {
  if (typeof document === "undefined") return "";
  const key = `land:${name}`;
  const hit = portraits.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 1100;
  const g = c.getContext("2d");
  if (!g) return "";
  let seed = [...name].reduce((sum, ch) => sum * 31 + ch.charCodeAt(0), 7);
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed & 0xffff) / 0xffff;
  };
  const sky = g.createLinearGradient(0, 0, 0, 1100);
  sky.addColorStop(0, "#fff3b0");
  sky.addColorStop(0.55, "#f5f0c9");
  sky.addColorStop(1, "#ece3f0");
  g.fillStyle = sky;
  g.fillRect(0, 0, 900, 1100);
  const ridges = ["#c9b6d9", "#9b82b5", "#5b3f75", "#320b35"];
  ridges.forEach((color, i) => {
    const base = 520 + i * 150;
    g.beginPath();
    g.moveTo(0, 1100);
    g.lineTo(0, base);
    for (let x = 0; x <= 900; x += 90)
      g.lineTo(x, base - rand() * (180 - i * 30));
    g.lineTo(900, 1100);
    g.closePath();
    g.globalAlpha = 0.55 + i * 0.15;
    g.fillStyle = color;
    g.fill();
  });
  g.globalAlpha = 1;
  const url = c.toDataURL("image/jpeg", 0.86);
  portraits.set(key, url);
  return url;
}

let webgl2: boolean | undefined;
/** Whether this browser can draw the WebGL2 galleries (false on the server) */
export function canUseWebGL2(): boolean {
  if (typeof document === "undefined") return false;
  if (webgl2 === undefined) {
    try {
      webgl2 = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
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
