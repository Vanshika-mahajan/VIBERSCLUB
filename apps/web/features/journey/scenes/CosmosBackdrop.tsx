"use client";

import { forwardRef } from "react";
import s from "../journey.module.css";

/** A small seeded random, so the stars are the same on the server and in the browser. */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** n stars as one box-shadow list, spread over a 2000 × 2000 tile */
function starfield(n: number, seed: number, colours: string[]) {
  const rand = seeded(seed);
  return Array.from({ length: n }, () => {
    const c = colours[Math.floor(rand() * colours.length)];
    return `${Math.round(rand() * 2000)}px ${Math.round(rand() * 2000)}px ${c}`;
  }).join(",");
}

const FAR = starfield(420, 7, [
  "rgba(255,255,255,0.55)",
  "rgba(190,215,255,0.5)",
]);
const MID = starfield(160, 21, [
  "rgba(255,255,255,0.85)",
  "rgba(170,230,255,0.8)",
  "rgba(255,226,170,0.8)",
]);
const NEAR = starfield(40, 42, ["#ffffff", "#bfeaff", "#ffe7b0"]);

/**
 * The world behind the door: midnight blue, a Milky Way band, three depths of stars.
 * It covers the screen but is clipped to the doorway until the camera passes through.
 * Milestone 4 adds the three.js canvas (sphere, deeper stars) inside this layer.
 */
export const CosmosBackdrop = forwardRef<
  HTMLDivElement,
  { children?: React.ReactNode }
>(function CosmosBackdrop({ children }, ref) {
  return (
    <div ref={ref} className={s.cosmos} data-cosmos aria-hidden="true">
      <div className={s.galaxy} />
      <div
        className={s.stars}
        style={{ boxShadow: FAR, width: 1, height: 1 }}
        data-stars="far"
      />
      <div
        className={s.stars}
        style={{ boxShadow: MID, width: 2, height: 2, borderRadius: 2 }}
        data-stars="mid"
      />
      <div
        className={s.stars}
        style={{
          boxShadow: NEAR,
          width: 3,
          height: 3,
          borderRadius: 3,
          filter: "drop-shadow(0 0 3px #bfeaff)",
        }}
        data-stars="near"
      />
      {children}
    </div>
  );
});
