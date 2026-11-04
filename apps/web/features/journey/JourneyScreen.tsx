"use client";

import "@fontsource-variable/fraunces/wght-italic.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import SplitText from "@/components/reactbits/SplitText";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";
import { CosmosBackdrop } from "./scenes/CosmosBackdrop";
import { DoorScene, type DoorSceneHandle } from "./scenes/DoorScene";
import { ThoughtInput } from "./scenes/ThoughtInput";
import { WorldCanvas } from "./scenes/WorldCanvas";
import { buildDoorOpening, buildDoorOpeningStill } from "./timelines/door";
import { buildWorldOpening } from "./timelines/world";
import type { World } from "./world/engine";
import { useJourney, type Phase } from "./useJourney";
import s from "./journey.module.css";

/** What a screen reader hears as each scene begins. */
const ANNOUNCE: Partial<Record<Phase, string>> = {
  opening: "The door opens.",
  cosmos: "You step into the cosmos.",
};

/**
 * The first page. The director (useJourney) owns the phase; each scene's timeline is built when
 * its phase begins and tells the director when it ends. Skip and Escape fast-forward the
 * running timeline. The stage carries data-phase so CSS and tests can follow along.
 */
export function JourneyScreen() {
  const journey = useJourney();
  const { phase, advance } = journey;
  const root = useRef<HTMLDivElement>(null);
  const door = useRef<DoorSceneHandle>(null);
  const cosmos = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  const worldScrim = useRef<HTMLDivElement>(null);
  const running = useRef<gsap.core.Timeline | null>(null);
  // the 3D world, once its first frame is on screen; until then (or without WebGL) the CSS scene plays
  const [world, setWorld] = useState<World | null>(null);

  // scene two: the door opens
  useGSAP(
    () => {
      if (phase !== "opening" || !door.current || !cosmos.current) return;
      const ui = [top.current!, copy.current!, ground.current!];
      const parts = { ...door.current, cosmos: cosmos.current, ui };
      const tl = world
        ? buildWorldOpening(world, [...ui, worldScrim.current!])
        : prefersReducedMotion()
          ? buildDoorOpeningStill(parts)
          : buildDoorOpening(parts);
      tl.eventCallback("onComplete", () => advance("cosmos"));
      running.current = tl;
      // development only: lets the review script step through the timeline frame by frame
      if (process.env.NODE_ENV !== "production")
        (
          window as unknown as { __journeyTl?: gsap.core.Timeline }
        ).__journeyTl = tl;
    },
    { dependencies: [phase], scope: root },
  );

  const skip = useCallback(() => {
    const tl = running.current;
    if (tl && tl.progress() < 1)
      tl.tweenTo(tl.duration(), { duration: 0.4, ease: "power1.inOut" });
  }, []);

  // Escape skips while a scene is playing; Skip takes focus so keyboard users find it first
  const playing = phase !== "idle" && phase !== "settled";
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, skip]);
  useEffect(() => {
    if (phase === "opening") skipButton.current?.focus({ preventScroll: true });
  }, [phase]);

  return (
    <div
      ref={root}
      className={s.journey}
      data-phase={phase}
      data-world={world ? "3d" : "css"}
    >
      <DoorScene ref={door} between={<CosmosBackdrop ref={cosmos} />} />
      <WorldCanvas onReady={setWorld} />
      <div ref={worldScrim} className={`${s.scrim} ${s.worldScrim}`} />

      <header ref={top} className={s.top}>
        <span className={s.brand}>Vibers Club</span>
        <Link href="/universe" className={s.skipLink}>
          Enter the app
        </Link>
      </header>

      <div ref={copy} className={s.copy}>
        <h1
          className={s.headline}
          aria-label="Every journey begins with a thought."
        >
          <SplitText
            tag="span"
            text="Every journey"
            splitType="chars"
            delay={28}
            duration={1.1}
            trigger="load"
            textAlign="center"
            className={s.line}
          />
          <SplitText
            tag="span"
            text="begins with a thought."
            splitType="chars"
            delay={28}
            duration={1.1}
            trigger="load"
            textAlign="center"
            className={s.line}
          />
        </h1>
      </div>

      <div ref={ground} className={s.ground}>
        <ThoughtInput locked={phase !== "idle"} onSubmit={journey.submit} />
      </div>

      {playing && (
        <button
          ref={skipButton}
          type="button"
          className={s.skip}
          onClick={skip}
        >
          Skip intro <span aria-hidden="true">&rarr;</span>
        </button>
      )}
      <p className={s.srOnly} aria-live="polite">
        {ANNOUNCE[phase] ?? ""}
      </p>
    </div>
  );
}
