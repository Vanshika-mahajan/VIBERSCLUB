"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EntryDoor } from "@/features/entry/EntryDoor";
import {
  startHum,
  throughTheDoor,
  unlockJourneySound,
  useJourneySound,
} from "@/features/journey/sound";
import { EarthStage } from "./EarthStage";
import s from "./earth.module.css";

/**
 * The first page (ARPIT, 2026-11-19: "door needs to open to the earth then earth will transition to
 * the home"): ARPIT's vine-wrapped door in their painted meadow (features/entry, unchanged) swings open
 * onto the stars and the journey's Earth; the Earth slows for Manali and dives toward it, and the valley
 * opens out into Home. ARPIT's door sound plays as it opens, then the journey's own Earth sounds (ARPIT,
 * 2026-11-19: "i want the sound we earlier had for earth", not the nature recording).
 */
export function DoorToEarth() {
  const [open, setOpen] = useState(false);
  // the door has been asked to open: from then on the Earth behind it is drawn
  const [opening, setOpening] = useState(false);
  const door = useRef<HTMLAudioElement>(null);
  const soundOn = useJourneySound();
  // back to the closed door each time the page shows again (pages stay mounted after leaving them).
  // Not on the first showing: without 3D the door reports itself done while mounting, before this runs.
  const path = usePathname();
  const shown = useRef(false);
  useEffect(() => {
    if (path !== "/") return;
    if (!shown.current) {
      shown.current = true;
      return;
    }
    setOpen(false);
    setOpening(false);
  }, [path]);

  const started = () => {
    setOpening(true);
    if (!soundOn) return;
    try {
      const a = door.current;
      if (a) {
        // the door file waits half a second for the film; here the latch gives at once
        a.currentTime = 0.7;
        a.volume = 0.85;
        void a.play().catch(() => {});
      }
      // the journey's sounds, set up inside the tap so the browser lets them play: the Earth hums as
      // the door opens, and a soft rush as we go through
      unlockJourneySound();
      startHum();
      window.setTimeout(throughTheDoor, 1700);
    } catch {
      /* no sound, the door still opens */
    }
  };

  return (
    <>
      <h1 className={s.hidden}>Vibers Club</h1>
      <EarthStage go={open} drawing={opening || open} />
      {/* the meadow as a still picture under the door's 3D scene: if a browser fails to draw the 3D (Safari
          can switch it off for a site), the visitor still sees the meadow and the door, never black */}
      {/* eslint-disable-next-line @next/next/no-img-element -- a full-screen still, shown only as a fallback */}
      <img className={s.still} src="/entry/meadow-door.webp" alt="" hidden={opening || open} />
      <audio ref={door} src="/film/door.mp3" preload="auto" />
      {!open && (
        <EntryDoor
          backdrop="meadow"
          alive
          onStart={started}
          onDone={() => setOpen(true)}
        />
      )}
    </>
  );
}
