"use client";

import { useState } from "react";
import { EntryDoor } from "./EntryDoor";

/** The review address: the door over Home every time, until it has opened. */
export function EntryDemo() {
  const [open, setOpen] = useState(false);
  return open ? null : <EntryDoor onDone={() => setOpen(true)} />;
}
