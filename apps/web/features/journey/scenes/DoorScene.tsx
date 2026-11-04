"use client";

import Image, { getImageProps } from "next/image";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import s from "../journey.module.css";

/**
 * What the opening timeline moves. The scene is two identical stages, one behind the cosmos
 * and one in front of it, so the cosmos can show through the doorway while the door leaf
 * still swings in front of it.
 */
export type DoorSceneHandle = {
  /** the two camera rigs; the push-in moves both together */
  cameras: HTMLElement[];
  /** the empty doorway in the back stage: the cosmos is clipped to its on-screen rectangle */
  hole: HTMLElement;
  leaf: HTMLElement;
  seam: HTMLElement;
  /** warm light filling the doorway, and the light it throws onto the grass */
  glow: HTMLElement;
  spill: HTMLElement;
  /** midnight veil over the meadow as we leave it */
  dusk: HTMLElement;
  /** the readability shade under the interface */
  scrim: HTMLElement;
  /** stops the mouse parallax so the camera has the scene to itself */
  freeze: () => void;
};

/** Tall phone screens get the portrait night still (the live door sits where the 3D camera puts it). */
export const PORTRAIT = "(max-aspect-ratio: 2/3)";

function Meadow() {
  const {
    props: { srcSet: portrait },
  } = getImageProps({
    src: "/journey/night-portrait.webp",
    width: 941,
    height: 1672,
    alt: "",
    sizes: "calc(100vw + 64px)",
  });
  const { props } = getImageProps({
    src: "/journey/night.webp",
    width: 1672,
    height: 941,
    alt: "",
    sizes: "max(100vw, 178svh)",
  });
  return (
    <picture>
      <source media={PORTRAIT} srcSet={portrait} sizes="calc(100vw + 64px)" />
      <img
        {...props}
        alt=""
        fetchPriority="high"
        className={`${s.cover} ${s.fill}`}
      />
    </picture>
  );
}

/** Pollen drifting through the evening light. Fixed positions, so server and browser render the same. */
const MOTES = [
  [12, 62, 3],
  [18, 48, 2],
  [24, 70, 4],
  [31, 55, 2],
  [37, 66, 3],
  [43, 52, 2],
  [57, 58, 3],
  [61, 72, 2],
  [66, 50, 4],
  [72, 63, 2],
  [78, 56, 3],
  [84, 68, 2],
  [89, 52, 3],
  [8, 74, 2],
  [50, 78, 2],
  [93, 62, 2],
] as const;

/**
 * Scene one: the meadow at golden hour with the pink door in the middle. `between` is rendered
 * between the two stages: the cosmos, seen through the doorway.
 * Idle motion (all off with reduced motion): the meadow breathes, the grass sways, pollen drifts,
 * the light at the door's seam glows, and on a mouse the layers shift at different depths.
 */
export const DoorScene = forwardRef<
  DoorSceneHandle,
  { between?: React.ReactNode }
>(function DoorScene({ between }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const hole = useRef<HTMLDivElement>(null);
  const spill = useRef<HTMLDivElement>(null);
  const dusk = useRef<HTMLDivElement>(null);
  const leaf = useRef<HTMLDivElement>(null);
  const seam = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const parallax = useRef(true);

  useImperativeHandle(
    ref,
    () => ({
      cameras: [back.current!, front.current!],
      hole: hole.current!,
      glow: glow.current!,
      spill: spill.current!,
      dusk: dusk.current!,
      leaf: leaf.current!,
      seam: seam.current!,
      scrim: scrim.current!,
      freeze: () => {
        parallax.current = false;
        gsap.to(root.current!.querySelectorAll("[data-depth]"), {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          overwrite: true,
        });
      },
    }),
    [],
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to("[data-layer=meadow]", {
          scale: 1.06,
          duration: 18,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        gsap.to("[data-layer=grass]", {
          skewX: 1.6,
          duration: 3.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        gsap.to("[data-layer=seam]", {
          opacity: 0.85,
          duration: 2.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
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
      // depth parallax for a mouse or trackpad only; both stages move together at each depth
      mm.add(
        "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
        () => {
          const depths = { meadow: 8, door: 16, grass: 28 } as const;
          const movers = gsap.utils
            .toArray<HTMLElement>("[data-depth]", root.current)
            .map((el) => ({
              depth: depths[el.dataset.depth as keyof typeof depths],
              x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" }),
              y: gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" }),
            }));
          const move = (e: PointerEvent) => {
            if (!parallax.current) return;
            const nx = e.clientX / window.innerWidth - 0.5;
            const ny = e.clientY / window.innerHeight - 0.5;
            for (const m of movers) {
              m.x(-nx * m.depth);
              m.y(-ny * m.depth * 0.5);
            }
          };
          window.addEventListener("pointermove", move);
          return () => window.removeEventListener("pointermove", move);
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className={s.scene} aria-hidden="true">
      <div ref={back} className={s.camera}>
        {/* back half: meadow, warm sun, the door frame with its empty doorway, the light spill, the dusk veil */}
        <div className={s.stage}>
          <div className={s.layer} data-depth="meadow">
            <div className={s.layer} data-layer="meadow">
              <Meadow />
            </div>
          </div>
          <div className={s.sun} />
          <div ref={spill} className={s.spill} data-depth="door" />
          <div className={s.layer} data-depth="door">
            <div className={s.door}>
              <span className={s.doorShadow} />
              <div ref={hole} className={s.hole} />
              <Image
                src="/journey/door-frame.webp"
                alt=""
                fill
                priority
                sizes="(orientation: portrait) 40vw, 18vw"
                className={s.contain}
              />
            </div>
          </div>
          <div ref={dusk} className={s.dusk} />
        </div>
      </div>
      {between}
      <div ref={front} className={s.camera}>
        {/* front half: the light in the doorway, the door leaf on its hinge, the seam, pollen, the front grass */}
        <div className={s.stage}>
          <div className={s.layer} data-depth="door">
            <div className={s.door}>
              <div ref={glow} className={s.glow} />
              <div ref={leaf} className={s.leaf}>
                <Image
                  src="/journey/door-leaf.webp"
                  alt=""
                  fill
                  priority
                  sizes="(orientation: portrait) 26vw, 12vw"
                />
                <span className={s.leafShade} />
              </div>
              <div ref={seam} className={s.seam} data-layer="seam" />
            </div>
          </div>
          <div className={s.layer}>
            {MOTES.map(([x, y, r], i) => (
              <span
                key={i}
                data-mote
                className={s.mote}
                style={{ left: `${x}%`, top: `${y}%`, width: r, height: r }}
              />
            ))}
          </div>
          <div className={s.layer} data-depth="grass">
            <div className={s.grass} data-layer="grass">
              <Image
                src="/journey/grass.webp"
                alt=""
                fill
                sizes="max(100vw, 178svh)"
                className={s.cover}
              />
            </div>
          </div>
        </div>
      </div>
      <div ref={scrim} className={s.scrim} />
    </div>
  );
});
