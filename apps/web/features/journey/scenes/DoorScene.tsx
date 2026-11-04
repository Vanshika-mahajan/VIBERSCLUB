"use client";

import Image, { getImageProps } from "next/image";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import s from "../journey.module.css";

/** Elements later milestones animate: the door opening and the push into the doorway. */
export type DoorSceneHandle = {
  stage: HTMLDivElement | null;
  door: HTMLDivElement | null;
};

/** Tall phone screens get ARPIT's portrait composition (door baked in, the live door layer sits exactly over it). */
export const PORTRAIT = "(max-aspect-ratio: 2/3)";

function Meadow() {
  const { props: { srcSet: portrait } } = getImageProps({ src: "/journey/meadow-portrait.webp", width: 941, height: 1672, alt: "", sizes: "calc(100vw + 64px)" });
  const { props } = getImageProps({ src: "/journey/meadow.webp", width: 1672, height: 941, alt: "", sizes: "max(100vw, 178svh)" });
  return (
    <picture>
      <source media={PORTRAIT} srcSet={portrait} sizes="calc(100vw + 64px)" />
      <img {...props} alt="" fetchPriority="high" className={`${s.cover} ${s.fill}`} />
    </picture>
  );
}

/** Pollen drifting through the evening light. Fixed positions, so server and browser render the same. */
const MOTES = [
  [12, 62, 3], [18, 48, 2], [24, 70, 4], [31, 55, 2], [37, 66, 3], [43, 52, 2], [57, 58, 3], [61, 72, 2],
  [66, 50, 4], [72, 63, 2], [78, 56, 3], [84, 68, 2], [89, 52, 3], [8, 74, 2], [50, 78, 2], [93, 62, 2],
] as const;

/**
 * Scene one: the meadow at golden hour with the pink door in the middle.
 * Layers, back to front: meadow, warm light, door with its shadow and light at the seam, pollen, front grass.
 * Idle motion (all off with reduced motion): the meadow breathes, the grass sways, pollen drifts,
 * the light at the door's seam glows, and on a mouse the layers shift at different depths.
 */
export const DoorScene = forwardRef<DoorSceneHandle>(function DoorScene(_, ref) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const door = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({ stage: stage.current, door: door.current }), []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to("[data-layer=meadow]", { scale: 1.06, duration: 18, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to("[data-layer=grass]", { skewX: 1.6, duration: 3.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to("[data-layer=seam]", { opacity: 0.85, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.utils.toArray<HTMLElement>("[data-mote]").forEach((m, i) => {
          gsap.fromTo(
            m,
            { y: 0, x: 0, opacity: 0 },
            {
              keyframes: { opacity: [0, 0.9, 0.9, 0] },
              y: -60 - (i % 4) * 24,
              x: (i % 2 ? 1 : -1) * (10 + (i % 3) * 8),
              duration: 7 + (i % 5),
              delay: i * 0.45,
              ease: "none",
              repeat: -1,
            },
          );
        });
      });
      // depth parallax for a mouse or trackpad only
      mm.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
        const layers = (["meadow", "door", "grass"] as const).map((name, i) => {
          const el = root.current!.querySelector<HTMLElement>(`[data-depth=${name}]`)!;
          const depth = [8, 16, 28][i];
          return {
            depth,
            x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" }),
            y: gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" }),
          };
        });
        const move = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          for (const l of layers) {
            l.x(-nx * l.depth);
            l.y(-ny * l.depth * 0.5);
          }
        };
        window.addEventListener("pointermove", move);
        return () => window.removeEventListener("pointermove", move);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className={s.scene} aria-hidden="true">
      <div ref={stage} className={s.stage}>
        <div className={s.layer} data-depth="meadow">
          <div className={s.layer} data-layer="meadow">
            <Meadow />
          </div>
        </div>
        <div className={s.sun} />
        <div className={s.layer} data-depth="door">
          <div ref={door} className={s.door}>
            <span className={s.doorShadow} />
            <span className={s.seam} data-layer="seam" />
            <Image src="/journey/door.webp" alt="" fill priority sizes="(orientation: portrait) 40vw, 18vw" className={s.contain} />
          </div>
        </div>
        <div className={s.layer}>
          {MOTES.map(([x, y, r], i) => (
            <span key={i} data-mote className={s.mote} style={{ left: `${x}%`, top: `${y}%`, width: r, height: r }} />
          ))}
        </div>
        <div className={s.layer} data-depth="grass">
          <div className={s.grass} data-layer="grass">
            <Image src="/journey/grass.webp" alt="" fill sizes="max(100vw, 178svh)" className={s.cover} />
          </div>
        </div>
      </div>
      <div className={s.scrim} />
    </div>
  );
});
