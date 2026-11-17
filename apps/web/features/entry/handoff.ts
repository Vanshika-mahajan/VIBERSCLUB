import { useSyncExternalStore } from "react";

/**
 * The hand-over from "/" to Home. The first page raises this flag and moves to /home on its first
 * frame; Home's EntryOnHome sees it and lays the door in the clouds over the real Home, so the door
 * opens onto Home itself with no change of page at the end. Kept in memory: a fresh visit to /home (or
 * a reload of it) never sees the door.
 */
let pending = false;
const listeners = new Set<() => void>();

export const entryHandoff = {
  start() {
    pending = true;
    listeners.forEach((l) => l());
  },
  finish() {
    pending = false;
    listeners.forEach((l) => l());
  },
};

export function useEntryHandoff() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => pending,
    () => false,
  );
}
