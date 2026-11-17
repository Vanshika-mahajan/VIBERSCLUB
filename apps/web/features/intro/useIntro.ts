"use client";

import { useCallback, useRef, useState } from "react";

/**
 * The entry experience as one controlled sequence. React state changes only at these
 * boundaries; everything in between is a GSAP timeline that reports back when it ends.
 * Phase 1 builds idle → door → entering → world; later phases add the rest.
 */
export const INTRO_PHASES = [
  "idle", // Scene 1: "A World Awaits", waiting for the button
  "door", // the door opens and the camera turns to it
  "entering", // the camera passes through the doorway
  "world", // the Vibers World
  "paraglider", // the paraglider crosses and comes toward us
  "canopy", // the canopy fills the screen
  "reveal", // the canopy pulls away from the real site
  "active", // the site has control
] as const;
export type IntroPhase = (typeof INTRO_PHASES)[number];

export type Intro = {
  phase: IntroPhase;
  /** Starts the sequence. Ignored once it has started, so repeated clicks can't break it. */
  start: () => boolean;
  /** Moves forward to a later phase. Never goes backwards. */
  advance: (to: IntroPhase) => void;
  /** Back to Scene 1 (the demo's Replay). */
  reset: () => void;
};

export const later = (to: IntroPhase, from: IntroPhase) =>
  INTRO_PHASES.indexOf(to) > INTRO_PHASES.indexOf(from);

export function useIntro(): Intro {
  const [phase, setPhase] = useState<IntroPhase>("idle");
  // the live phase, so a second click in the same frame is still refused
  const now = useRef<IntroPhase>("idle");
  const go = useCallback((p: IntroPhase) => {
    now.current = p;
    setPhase(p);
  }, []);
  const start = useCallback(() => {
    if (now.current !== "idle") return false;
    go("door");
    return true;
  }, [go]);
  const advance = useCallback(
    (to: IntroPhase) => {
      if (later(to, now.current)) go(to);
    },
    [go],
  );
  const reset = useCallback(() => go("idle"), [go]);
  return { phase, start, advance, reset };
}
