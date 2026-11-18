"use client";

import { useState } from "react";
import { EntryDoor } from "./EntryDoor";

/** The review address: the door over Home every time, until it has opened. Trying the meadow backdrop. */
export function EntryDemo() {
  const [open, setOpen] = useState(false);
  return open ? null : <EntryDoor backdrop="meadow" alive onDone={() => setOpen(true)} />;
}
