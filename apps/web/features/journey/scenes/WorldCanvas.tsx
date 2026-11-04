"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion/gsap";
import type { World } from "../world/engine";
import type { WorldParams } from "../world/params";
import { canUse3D, measureFps, MIN_FPS, worldChoice } from "../world/support";
import s from "../journey.module.css";

type Props = {
  /** the numbers the timelines animate; the world reads them every frame */
  params: WorldParams;
  /** called once the first 3D frame is on screen; the CSS scene underneath can then step aside */
  onReady: (world: World) => void;
};

/**
 * Hosts the three.js world. Loads three.js and the engine only on devices that get the 3D journey,
 * checks the device keeps it smooth, fades the canvas in over the identical CSS scene, and frees every
 * GPU resource when the page is left.
 */
export function WorldCanvas({ params, onReady }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });

  useEffect(() => {
    if (!canUse3D() || !canvas.current) return;
    let world: World | undefined;
    let cancelled = false;
    let removeLook = () => {};
    (async () => {
      try {
        const { createWorld } = await import("../world/engine");
        if (cancelled) return;
        world = await createWorld(canvas.current!, params);
        if (cancelled) return world.dispose();
        // let it draw unseen for a moment: a device that can't keep it smooth keeps the CSS scene
        const fps = await measureFps();
        if (cancelled) return;
        if (fps < MIN_FPS && worldChoice() !== "3d") {
          world.dispose();
          world = undefined;
          return;
        }
        const p = world.params;
        const lookX = gsap.quickTo(p, "lookX", {
          duration: 1.4,
          ease: "power3.out",
        });
        const lookY = gsap.quickTo(p, "lookY", {
          duration: 1.4,
          ease: "power3.out",
        });
        const move = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          lookX((e.clientX / window.innerWidth) * 2 - 1);
          lookY((e.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener("pointermove", move);
        removeLook = () => window.removeEventListener("pointermove", move);
        gsap.to(canvas.current, {
          autoAlpha: 1,
          duration: 0.6,
          ease: "power1.out",
        });
        ready.current(world);
        // development only: the review script renders the journey frame by frame
        if (process.env.NODE_ENV !== "production")
          (window as unknown as { __journeyWorld?: World }).__journeyWorld =
            world;
      } catch {
        /* no WebGL after all: the CSS scene stays */
      }
    })();
    return () => {
      cancelled = true;
      removeLook();
      world?.dispose();
    };
  }, [params]);

  return (
    <canvas ref={canvas} className={s.world} aria-hidden="true" data-world />
  );
}
