"use client";

import { useCallback, useEffect, useState } from "react";

export type Mode = "day" | "night";
const KEY = "vibers.door.mode";

/**
 * Day or night on the door page. The visitor's own choice is remembered in this browser; until they
 * choose, the page follows their system's light or dark setting. The server always renders night
 * (the page's default), and the browser corrects it after the first paint.
 */
export function useDayNight() {
  const [mode, setMode] = useState<Mode>("night");
  // whether the mode has been read on this device yet (the first change applies without animation)
  const [known, setKnown] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(KEY);
    } catch {
      /* storage blocked: follow the system */
    }
    const system = window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "day"
      : "night";
    // reading the device's setting once on mount is the point of this effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(saved === "day" || saved === "night" ? saved : system);
    setKnown(true);
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => {
      const next = m === "day" ? "night" : "day";
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        /* not remembered, still switched */
      }
      return next;
    });
  }, []);

  return { mode, known, toggle };
}
