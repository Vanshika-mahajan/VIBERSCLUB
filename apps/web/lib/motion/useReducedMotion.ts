import { useSyncExternalStore } from "react";

/** True when the device asks for reduced motion. Motion components skip their animation then. */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(fn: () => void) {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener("change", fn);
  return () => mq?.removeEventListener("change", fn);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.(QUERY).matches ?? false);
}

/** The server renders as "reduced", so nothing animates or loads WebGL until the browser has said otherwise. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => true);
}
