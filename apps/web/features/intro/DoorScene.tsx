"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion/gsap";
import { canUse3D } from "@/features/journey/world/support";
import type { DoorStage } from "./world/stage";
import type { IntroParams } from "./world/params";
import s from "./intro.module.css";

type Props = {
  /** the numbers the timelines animate; the stage reads them every frame */
  params: IntroParams;
  /** called once the first 3D frame is on screen (the painted still underneath can step aside) */
  onReady: (stage: DoorStage) => void;
};

/**
 * Hosts the 3D door. Loads three.js and the stage only on devices that get 3D (reduced motion and
 * low-power devices keep the painted still), follows the pointer for a little parallax, and frees
 * every GPU resource when the page is left.
 */
export function DoorScene({ params, onReady }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });

  useEffect(() => {
    if (!canUse3D() || !canvas.current) return;
    let stage: DoorStage | undefined;
    let cancelled = false;
    let unlook = () => {};
    (async () => {
      try {
        const { createDoorStage } = await import("./world/stage");
        if (cancelled) return;
        stage = await createDoorStage(canvas.current!, params);
        if (cancelled) return stage.dispose();
        const lookX = gsap.quickTo(params, "lookX", { duration: 1.4, ease: "power3.out" });
        const lookY = gsap.quickTo(params, "lookY", { duration: 1.4, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          lookX((e.clientX / window.innerWidth) * 2 - 1);
          lookY((e.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener("pointermove", move);
        unlook = () => window.removeEventListener("pointermove", move);
        gsap.to(canvas.current, { autoAlpha: 1, duration: 0.5, ease: "power1.out" });
        ready.current(stage);
      } catch {
        /* no WebGL after all: the painted still stays */
      }
    })();
    return () => {
      cancelled = true;
      unlook();
      stage?.dispose();
    };
  }, [params]);

  return <canvas ref={canvas} className={s.canvas} aria-hidden="true" data-intro-3d />;
}
