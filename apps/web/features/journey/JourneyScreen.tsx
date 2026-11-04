"use client";

import "@fontsource-variable/fraunces/wght-italic.css";
import Link from "next/link";
import { useRef } from "react";
import SplitText from "@/components/reactbits/SplitText";
import { DoorScene, type DoorSceneHandle } from "./scenes/DoorScene";
import { ThoughtInput } from "./scenes/ThoughtInput";
import { useJourney } from "./useJourney";
import s from "./journey.module.css";

/**
 * The first page. Milestone 2: the door scene and the thought.
 * The stage carries data-phase so CSS and tests can follow the journey.
 */
export function JourneyScreen() {
  const journey = useJourney();
  const door = useRef<DoorSceneHandle>(null);

  return (
    <div className={s.journey} data-phase={journey.phase}>
      <DoorScene ref={door} />

      <header className={s.top}>
        <span className={s.brand}>Vibers Club</span>
        <Link href="/universe" className={s.skipLink}>
          Enter the app
        </Link>
      </header>

      <div className={s.copy}>
        <h1 className={s.headline} aria-label="Every journey begins with a thought.">
          <SplitText tag="span" text="Every journey" splitType="chars" delay={28} duration={1.1} trigger="load" textAlign="center" className={s.line} />
          <SplitText tag="span" text="begins with a thought." splitType="chars" delay={28} duration={1.1} trigger="load" textAlign="center" className={s.line} />
        </h1>
      </div>

      <div className={s.ground}>
        <ThoughtInput locked={journey.phase !== "idle"} onSubmit={journey.submit} />
      </div>
    </div>
  );
}
