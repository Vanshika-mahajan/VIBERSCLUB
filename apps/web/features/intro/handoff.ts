import { useSyncExternalStore } from "react";

/**
 * The hand-over from the entry to the site. When the paraglider's canopy fills the screen, the entry
 * raises this flag and moves to /home; Home's CanopyReveal sees it on its very first frame, draws the
 * same canopy over the page and opens it like a curtain. Kept in memory: a fresh visit to /home (or a
 * reload) never sees it.
 */
let pending = false;
const listeners = new Set<() => void>();

export const handoff = {
  start() {
    pending = true;
    listeners.forEach((l) => l());
  },
  finish() {
    pending = false;
    listeners.forEach((l) => l());
  },
};

export function useHandoff() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => pending,
    () => false,
  );
}
