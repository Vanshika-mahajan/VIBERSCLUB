"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EntryDoor } from "@/features/entry/EntryDoor";
import { useJourneySound } from "@/features/journey/sound";
import { startAmbience } from "@/features/film/ambience";
import { EarthStage } from "./EarthStage";
import s from "./earth.module.css";

/**
 * The first page (ARPIT, 2026-11-19: "door needs to open to the earth then earth will transition to
 * the home"): ARPIT's vine-wrapped door in their painted meadow (features/entry, unchanged) swings open
 * onto the stars and the journey's Earth; the Earth slows for Manali and dives toward it, and the valley
 * lifts away into Home. The door sounds as it opens, over the soft nature recording (ARPIT's own).
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
      startAmbience();
    } catch {
      /* no sound, the door still opens */
    }
  };

  return (
    <>
      <h1 className={s.hidden}>Vibers Club</h1>
      <EarthStage go={open} drawing={opening || open} />
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
