"use client";

import "@fontsource-variable/fraunces/wght-italic.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SplitText from "@/components/reactbits/SplitText";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";
import { matchThought } from "./match";
import { CosmosBackdrop } from "./scenes/CosmosBackdrop";
import { Discovery, type DiscoveryHandle } from "./scenes/Discovery";
import { DoorScene, type DoorSceneHandle } from "./scenes/DoorScene";
import { ThoughtInput } from "./scenes/ThoughtInput";
import { WorldCanvas } from "./scenes/WorldCanvas";
import {
  buildDiscovery,
  buildDiscoveryStill,
  makeDriver,
} from "./timelines/discovery";
import { buildDoorOpening, buildDoorOpeningStill } from "./timelines/door";
import { buildWorldOpening } from "./timelines/world";
import type { World } from "./world/engine";
import { initialParams } from "./world/params";
import { useDayNight } from "./useDayNight";
import { useJourney, type Phase } from "./useJourney";
import s from "./journey.module.css";

/** What a screen reader hears as each scene begins. */
const ANNOUNCE: Partial<Record<Phase, string>> = {
  opening: "The door opens.",
  cosmos: "You step into the cosmos.",
  manali: "Manali, India.",
  orbit: "Vibers appear around Manali.",
  settled:
    "Your vibe has a universe. Here are some Vibers who might see the world the way you do.",
};

/**
 * The first page. The director (useJourney) owns the phase; each scene's timeline is built when
 * its phase begins and tells the director when it ends. Skip and Escape fast-forward the
 * running timeline. The stage carries data-phase so CSS and tests can follow along.
 */
export function JourneyScreen() {
  const journey = useJourney();
  const { phase, advance, thought } = journey;
  const root = useRef<HTMLDivElement>(null);
  const door = useRef<DoorSceneHandle>(null);
  const cosmos = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  const worldScrim = useRef<HTMLDivElement>(null);
  const running = useRef<gsap.core.Timeline | null>(null);
  const discovery = useRef<DiscoveryHandle>(null);
  // Skip means "take me to the result": every scene after it starts already finished
  const skipping = useRef(false);
  // what every timeline animates; the 3D world and the CSS scenes both read it
  const [params] = useState(initialParams);
  const cards = useMemo(
    () => (thought ? matchThought(thought) : []),
    [thought],
  );
  // the 3D world, once its first frame is on screen; until then (or without WebGL) the CSS scene plays
  const [world, setWorld] = useState<World | null>(null);

  // day or night on the door page: the 3D world fades between them, the CSS follows data-mode
  const { mode, known, toggle } = useDayNight();
  const firstMode = useRef(true);
  useEffect(() => {
    if (!known) return;
    const day = mode === "day" ? 1 : 0;
    gsap.to(params, {
      day,
      duration: firstMode.current || prefersReducedMotion() ? 0 : 1.6,
      ease: "sine.inOut",
      overwrite: true,
    });
    firstMode.current = false;
  }, [mode, known, params]);

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
      tl.data = "door";
      running.current = tl;
      // development only: lets the review script step through the timeline frame by frame
      if (process.env.NODE_ENV !== "production")
        (
          window as unknown as { __journeyTl?: gsap.core.Timeline }
        ).__journeyTl = tl;
    },
    { dependencies: [phase], scope: root },
  );

  // scenes three to five: the sphere, Manali, the Vibers in orbit, the row
  useGSAP(
    () => {
      if (phase !== "cosmos" || !discovery.current) return;
      const d = discovery.current;
      const tl = prefersReducedMotion()
        ? buildDiscoveryStill(params, d)
        : buildDiscovery(params, d, advance);
      tl.eventCallback("onComplete", () => advance("settled"));
      running.current = tl;
      if (process.env.NODE_ENV !== "production")
        (
          window as unknown as { __journeyTl?: gsap.core.Timeline }
        ).__journeyTl = tl;
      if (skipping.current) tl.progress(1);
    },
    { dependencies: [phase], scope: root },
  );

  // from the cosmos on, one function a frame places the sphere's label and the cards
  const inCosmos = phase !== "idle" && phase !== "opening";
  useEffect(() => {
    if (!inCosmos || !discovery.current) return;
    const drive = makeDriver(params, discovery.current, !!world);
    gsap.ticker.add(drive);
    return () => gsap.ticker.remove(drive);
  }, [inCosmos, params, world]);

  // once settled, the heading takes focus so keyboard and screen-reader users start at the result
  useEffect(() => {
    if (phase === "settled")
      discovery.current?.head
        .querySelector<HTMLElement>("h2")
        ?.focus({ preventScroll: true });
  }, [phase]);

  const skip = useCallback(() => {
    skipping.current = true;
    const tl = running.current;
    if (!tl || tl.progress() >= 1) return;
    // the door finishes quickly; later scenes jump straight to the result
    if (tl.data === "door")
      tl.tweenTo(tl.duration(), { duration: 0.4, ease: "power1.inOut" });
    else tl.progress(1);
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
      data-mode={mode}
    >
      <DoorScene ref={door} between={<CosmosBackdrop ref={cosmos} />} />
      <WorldCanvas params={params} onReady={setWorld} />
      <div ref={worldScrim} className={`${s.scrim} ${s.worldScrim}`} />
      <Discovery
        ref={discovery}
        cards={cards}
        settled={phase === "settled"}
        world3d={!!world}
      />

      <header ref={top} className={s.top}>
        <span className={s.brand}>Vibers Club</span>
        <div className={s.topActions}>
          <button
            type="button"
            className={s.mode}
            onClick={toggle}
            aria-label={mode === "day" ? "Switch to night" : "Switch to day"}
            title={mode === "day" ? "Night" : "Day"}
          >
            {mode === "day" ? <MoonIcon /> : <SunIcon />}
          </button>
          <Link href="/universe" className={s.skipLink}>
            Enter the app
          </Link>
        </div>
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

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8Z"
      />
    </svg>
  );
}
