"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { canUse3D } from "@/features/journey/world/support";
import { handover, preloadHome } from "@/features/camp/handover";
import { stopAmbience } from "@/features/film/ambience";
import s from "./earth.module.css";

type Earth = Awaited<ReturnType<typeof import("./earthScene").makeEarth>>;

/**
 * Behind the door: the journey's Earth among the stars, turning fast while the door is shut. When the
 * door has opened (`go`), it slows until Manali comes round and dives toward it; close over Manali
 * with the valley lit, that frame lifts away over Home (the hand-over, components/handover/Handover.tsx).
 */
export function EarthStage({
  go: goNow,
  drawing,
}: {
  go: boolean;
  drawing: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLParagraphElement>(null);
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

  const made = useRef(false);
  const raf = useRef(0);
  useEffect(() => {
    if (!drawing || made.current) return;
    const el = canvas.current;
    if (!el || !canUse3D()) return;
    made.current = true;
    import("./earthScene")
      .then(async ({ makeEarth, at, ENTRY_LENGTH }) => {
        const e = await makeEarth(el, ENTRY_LENGTH);
        if (!made.current) return e.dispose();
        earth.current = e;
        // the door may already have opened while it was being made
        if (go.current) e.replay();
        else e.wait();
        el.dataset.live = "";
        const loop = (time: number) => {
          raf.current = requestAnimationFrame(loop);
          if (!draw.current) return;
          const t = e.render(time);
          // the place name shows with the marker, just under Manali at the centre (as in the journey)
          if (label.current)
            label.current.style.opacity = String(
              go.current ? at(t, ENTRY_LENGTH).marker : 0,
            );
          if (t >= ENTRY_LENGTH && !left.current) {
            left.current = true;
            try {
              handover.show(e.snapshot(), home.current ?? Promise.resolve());
              stopAmbience(3);
            } catch {
              /* Home simply opens */
            }
            router.push("/home");
          }
        };
        raf.current = requestAnimationFrame(loop);
      })
      .catch(() => router.push("/home"));
  }, [drawing, router]);

  useEffect(() => {
    const onResize = () => earth.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf.current);
      made.current = false;
      earth.current?.dispose();
      earth.current = null;
    };
  }, []);

  // the door has opened: the Earth slows for Manali and dives; without 3D, Home straight away
  useEffect(() => {
    if (!goNow) {
      left.current = false;
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
    </div>
  );
}
