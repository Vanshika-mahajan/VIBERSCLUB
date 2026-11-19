"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { canUse3D } from "@/features/journey/world/support";
import { preloadHome } from "@/features/camp/handover";
import {
  arrivalChime,
  dive,
  endDive,
  leaveJourney,
  markerBell,
  stopHum,
} from "@/features/journey/sound";
import s from "./earth.module.css";

type Earth = Awaited<ReturnType<typeof import("./earthScene").makeEarth>>;

/**
 * Behind the door: the journey's Earth among the stars, turning fast while the door is shut. When the
 * door has opened (`go`), it slows until Manali comes round and dives toward it; still falling into the
 * valley, it opens out into the home page's own colour from the centre and Home settles in out of it,
 * as the journey did (features/journey/timelines/discovery.ts). The journey's Earth sounds play along.
 */

/** the journey's sounds over the dive, at its own moments (seconds after the door has opened) */
const CUES: [number, () => void][] = [
  [3.4, () => dive(3.3)],
  [4.6, markerBell],
  [6.2, () => stopHum(1.4)],
  [6.6, arrivalChime],
  [6.7, () => endDive(0.6)],
];
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/**
 * The journey ends on the home page's own background; this marks the page so the club home settles in
 * out of it (see "arriving" in globals.css) instead of popping in (as in features/journey).
 */
function arriveHome() {
  const root = document.documentElement;
  root.dataset.arrived = "";
  window.setTimeout(() => delete root.dataset.arrived, 1400);
}
export function EarthStage({
  go: goNow,
  drawing,
}: {
  go: boolean;
  drawing: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLParagraphElement>(null);
  const arrive = useRef<HTMLDivElement>(null);
  const cue = useRef(0);
  const earth = useRef<Earth | null>(null);
  const left = useRef(false);
  // behind the shut door nothing shows, so the Earth is drawn only once (to be ready), not every frame
  const draw = useRef(drawing);
  useEffect(() => void (draw.current = drawing), [drawing]);
  const go = useRef(goNow);
  useEffect(() => void (go.current = goNow), [goNow]);
  const router = useRouter();
  const home = useRef<Promise<unknown> | null>(null);

  // Home, and the Earth's own map, are fetched at once; the Earth's WebGL is only made when the door
  // is asked to open. Two big WebGL scenes made together on load left Safari drawing neither (ARPIT's
  // screenshot, 2026-11-19: only the button on black), so the door's scene has the GPU to itself first.
  useEffect(() => {
    router.prefetch("/home");
    home.current = preloadHome();
    const map = new Image();
    map.src = "/journey/earth-land.png";
  }, [router]);

  // the Earth's WebGL is made a moment after the door has settled, not inside the tap: compiling it
  // there made the door's first swing stutter (ARPIT, 2026-11-19)
  const [early, setEarly] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setEarly(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  const made = useRef(false);
  const raf = useRef(0);
  useEffect(() => {
    if (!(drawing || early) || made.current) return;
    const el = canvas.current;
    if (!el || !canUse3D()) return;
    made.current = true;
    import("./earthScene")
      .then(async ({ makeEarth, at, ARRIVE_AT, ENTRY_LENGTH }) => {
        const e = await makeEarth(el, ENTRY_LENGTH);
        if (!made.current) return e.dispose();
        earth.current = e;
        // the door may already have opened while it was being made
        if (go.current) e.replay();
        else e.wait();
        el.dataset.live = "";
        // one frame now, so its shaders are ready before the door opens onto it
        e.render(performance.now());
        const loop = (time: number) => {
          raf.current = requestAnimationFrame(loop);
          if (!draw.current) return;
          const t = e.render(time);
          // the place name shows with the marker, just under Manali at the centre (as in the journey)
          if (label.current)
            label.current.style.opacity = String(
              go.current ? at(t, ENTRY_LENGTH).marker : 0,
            );
          if (!go.current) return;
          while (cue.current < CUES.length && t >= CUES[cue.current][0])
            CUES[cue.current++][1]();
          // the home page's colour opens out from the centre, over the valley we are still falling into
          const a = arrive.current;
          if (a) {
            const k = t - ARRIVE_AT;
            a.style.opacity = String(Math.sin((Math.PI / 2) * clamp01(k / 0.5)));
            a.style.setProperty("--r", `${-30 + 140 * clamp01(k / 1.2) ** 2}%`);
          }
          if (t >= ENTRY_LENGTH && !left.current) {
            left.current = true;
            arriveHome();
            router.push("/home");
          }
        };
        raf.current = requestAnimationFrame(loop);
      })
      .catch(() => router.push("/home"));
  }, [drawing, early, router]);

  useEffect(() => {
    const onResize = () => earth.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf.current);
      made.current = false;
      leaveJourney();
      earth.current?.dispose();
      earth.current = null;
    };
  }, []);

  // the door has opened: the Earth slows for Manali and dives; without 3D, Home straight away
  useEffect(() => {
    if (!goNow) {
      left.current = false;
      cue.current = 0;
      if (arrive.current) arrive.current.style.opacity = "0";
      earth.current?.wait();
      return;
    }
    if (!canUse3D()) {
      router.push("/home");
      return;
    }
    earth.current?.replay();
  }, [goNow, router]);

  return (
    <div className={s.stage} aria-hidden="true">
      <canvas ref={canvas} className={s.canvas} />
      <p ref={label} className={s.place}>
        <span className={s.placeDot} />
        Manali, India
      </p>
      <div ref={arrive} className={s.arrive} />
    </div>
  );
}
