"use client";

import { useSyncExternalStore } from "react";

let today: Date | null = null;
const noop = () => () => {};

/** today's date on the client; null while prerendering, so dates never mismatch on hydration */
export function useToday(): Date | null {
  return useSyncExternalStore(
    noop,
    () => (today ??= new Date()),
    () => null,
  );
}
