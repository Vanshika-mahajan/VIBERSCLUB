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

  useEffect(() => {
    router.prefetch("/home");
    home.current = preloadHome();
    const el = canvas.current;
    if (!el || !canUse3D()) return;
    let raf = 0;
    let gone = false;
    const onResize = () => earth.current?.resize();
    import("./earthScene")
      .then(async ({ makeEarth, at, ENTRY_LENGTH }) => {
        const made = await makeEarth(el, ENTRY_LENGTH);
        if (gone) return made.dispose();
        earth.current = made;
        made.wait();
        el.dataset.live = "";
        made.render(performance.now());
        const loop = (time: number) => {
          raf = requestAnimationFrame(loop);
          if (!draw.current) return;
          const t = made.render(time);
          // the place name shows with the marker, just under Manali at the centre (as in the journey)
          if (label.current)
            label.current.style.opacity = String(
              go.current ? at(t, ENTRY_LENGTH).marker : 0,
            );
          if (t >= ENTRY_LENGTH && !left.current) {
            left.current = true;
            try {
              handover.show(made.snapshot(), home.current ?? Promise.resolve());
              stopAmbience(3);
            } catch {
              /* Home simply opens */
            }
            router.push("/home");
          }
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {});
    window.addEventListener("resize", onResize);
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      earth.current?.dispose();
      earth.current = null;
    };
  }, [router]);

  // the door has opened: the Earth slows for Manali and dives; without 3D, Home straight away
  useEffect(() => {
    if (!goNow) {
      left.current = false;
      earth.current?.wait();
      return;
    }
    if (!earth.current) {
      router.push("/home");
      return;
    }
    earth.current.replay();
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
