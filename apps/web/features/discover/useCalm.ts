import { useCallback, useSyncExternalStore } from "react";

/** Calm mode: on when the person chose it here, or when the device asks for reduced motion. */
const KEY = "vibers.discover.calm";
const listeners = new Set<() => void>();

function read(): boolean {
  let chosen: string | null = null;
  try {
    chosen = localStorage.getItem(KEY);
  } catch {
    /* storage can be blocked */
  }
  if (chosen !== null) return chosen === "1";
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  mq?.addEventListener("change", fn);
  return () => {
    listeners.delete(fn);
    mq?.removeEventListener("change", fn);
  };
}

export function useCalm(): [boolean, (on: boolean) => void] {
  const calm = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((on: boolean) => {
    try {
      localStorage.setItem(KEY, on ? "1" : "0");
    } catch {
      /* storage can be blocked; the choice then lasts until reload at most */
    }
    listeners.forEach((fn) => fn());
  }, []);
  return [calm, set];
}
