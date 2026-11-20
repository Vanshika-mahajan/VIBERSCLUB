"use client";

import { useEffect, useState } from "react";
import { EntryDoor } from "./EntryDoor";

/**
 * The door over the camp, until it has opened. Pages stay mounted after leaving them, so coming back
 * (the effect runs again when the page shows) puts the door back, closed.
 */
export function EntryDemo({ through = false, sky }: { through?: boolean; sky?: "blue" } = {}) {
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- back to the closed door each time the page shows again
  useEffect(() => setOpen(false), []);
  return open ? null : (
    <EntryDoor
      backdrop="meadow"
      alive
      through={through}
      sky={sky}
      onDone={() => setOpen(true)}
    />
  );
}
