"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/motion/gsap";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";
import { DoorScene } from "./DoorScene";
import { buildDoorOpening } from "./timelines/door";
import { useIntro, type IntroPhase } from "./useIntro";
import { initialIntroParams } from "./world/params";
import { ART } from "./world/stage";
import s from "./intro.module.css";

/** What a screen reader hears as each scene begins. */
const ANNOUNCE: Partial<Record<IntroPhase, string>> = {
  door: "The door opens.",
  world: "You step into the Vibers World.",
};

/**
 * The entry experience, one continuous screen. Scene 1 waits for "Unveil What Awaits"; from the
 * click on, timelines run the sequence and report back to the director (useIntro) at each scene's
 * end. The stage carries data-phase so CSS and tests can follow along.
 *
 * Phase 1 (this demo): Scene 1, the button and the 3D door, ending in the Vibers World as a still.
 */
export function IntroExperience() {
  const { phase, start, advance, reset } = useIntro();
  const [params, setParams] = useState(initialIntroParams);
  const [has3D, setHas3D] = useState(false);
  const copy = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const running = useRef<gsap.core.Timeline | null>(null);

  // whatever is running stops when the page is left
  useEffect(() => {
    // development only: the review script steps GSAP's clock by hand to record smooth frames
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __gsap: gsap });
    return () => void running.current?.kill();
  }, []);

  const unveil = useCallback(() => {
    if (!start()) return; // already under way: extra clicks do nothing
    const arrive = () => {
      advance("world");
      if (world.current)
        gsap.fromTo(world.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: has3D ? 0.45 : 0.9, ease: "power1.out" });
    };
    if (!has3D || prefersReducedMotion()) {
      // the painted still: a short dissolve into the world instead of the walk through the door
      if (copy.current) gsap.to(copy.current, { autoAlpha: 0, duration: 0.4 });
      running.current = gsap.timeline().call(() => advance("entering"), [], 0.2).call(arrive, [], 0.3);
      return;
    }
    running.current = buildDoorOpening(params, { copy: copy.current }, {
      entering: () => advance("entering"),
      arrived: arrive,
    });
    // development only: the review script steps through the timeline frame by frame
    if (process.env.NODE_ENV !== "production")
      Object.assign(window, { __introTimeline: running.current });
  }, [start, advance, has3D, params]);

  const replay = useCallback(() => {
    running.current?.kill();
    if (world.current) gsap.set(world.current, { autoAlpha: 0 });
    if (copy.current) gsap.set(copy.current, { autoAlpha: 1, y: 0 });
    // a fresh set of numbers puts the door and the camera back where they started
    setParams(initialIntroParams());
    setHas3D(false);
    reset();
  }, [reset]);

  return (
    <div className={s.intro} data-phase={phase}>
      <p className="sr-only" aria-live="polite">
        {ANNOUNCE[phase] ?? ""}
      </p>

      {/* Scene 1: the painted still, under the 3D door until it is ready (and instead of it without 3D) */}
      <div className={s.scene} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`${s.plate} ${has3D ? s.hidden : ""}`} src={ART.plate} alt="" />
        <DoorScene params={params} onReady={() => setHas3D(true)} />
      </div>

      <div ref={copy} className={s.copy}>
        <p className={s.wordmark}>Vibers Club</p>
        <h1 className={s.headline}>
          A World <span>Awaits</span>
        </h1>
        <svg className={s.swash} viewBox="0 0 220 18" aria-hidden="true">
          <path d="M3 13 C 50 3, 120 2, 217 9" />
        </svg>
        <button
          type="button"
          className={s.unveil}
          onClick={unveil}
          disabled={phase !== "idle"}
        >
          <span>Unveil What Awaits</span>
          <span className={s.arrow} aria-hidden="true">
            →
          </span>
        </button>
      </div>

      {/* Scene 2 as a still for now: Phase 2 brings it to life */}
      <div ref={world} className={s.world} aria-hidden={phase !== "world"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.world} alt="The Vibers World: a lodge with a Vibers Club sign by a river, Vibers around a campfire at dusk" />
        {phase === "world" && (
          <div className={s.demoBar}>
            <span>Phase 1 ends here. Phase 2 brings the Vibers World to life.</span>
            <button type="button" onClick={replay}>
              Replay
            </button>
            <Link href="/home">Go to the site</Link>
          </div>
        )}
      </div>
    </div>
  );
}
