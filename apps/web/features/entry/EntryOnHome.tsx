"use client";

import { EntryDoor } from "./EntryDoor";
import { entryHandoff, useEntryHandoff } from "./handoff";

/** On Home: nothing, unless the visitor has just come in through "/" (handoff.ts). Then the door. */
export function EntryOnHome() {
  const pending = useEntryHandoff();
  if (!pending) return null;
  return <EntryDoor onDone={entryHandoff.finish} />;
}
