"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion/gsap";
import type { LivingWorld } from "./world/living";
import s from "./intro.module.css";

type Props = {
  /** Scene 2's painting, and the patch of sky that paints out its paraglider */
  src: string;
  patch: string;
  /** called once the first living frame is on screen, so the still underneath can step aside */
  onReady: (world: LivingWorld) => void;
};

/**
 * Hosts the living Vibers World (world/living.ts) over its painted still. Mounted as we start through
 * the door, only where 3D is allowed; frees the GPU when the page is left.
 */
export function WorldScene({ src, patch, onReady }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<LivingWorld | null>(null);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });

  useEffect(() => {
    if (!canvas.current) return;
    let cancelled = false;
    let living: LivingWorld | undefined;
    let unlook = () => {};
    (async () => {
      try {
        const { createLivingWorld } = await import("./world/living");
        if (cancelled) return;
        living = await createLivingWorld(canvas.current!, src, patch);
        if (cancelled) return living.dispose();
        world.current = living;
        const lookX = gsap.quickTo(living.params, "lookX", { duration: 1.6, ease: "power3.out" });
        const lookY = gsap.quickTo(living.params, "lookY", { duration: 1.6, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          lookX((e.clientX / window.innerWidth) * 2 - 1);
          lookY((e.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener("pointermove", move);
        unlook = () => window.removeEventListener("pointermove", move);
        canvas.current!.style.opacity = "1";
        // the view drifts slowly closer, toward the lodge and the fire
        gsap.to(living.params, { push: 1, duration: 24, ease: "sine.inOut" });
        ready.current(living);
      } catch {
        /* no WebGL after all: the painted still stays */
      }
    })();
    return () => {
      cancelled = true;
      unlook();
      world.current = null;
      if (living) gsap.killTweensOf(living.params);
      living?.dispose();
    };
  }, [src, patch]);

  return <canvas ref={canvas} className={s.worldCanvas} aria-hidden="true" data-intro-world />;
}
