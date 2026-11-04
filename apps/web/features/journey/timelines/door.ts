import { gsap } from "@/lib/motion/gsap";
import type { DoorSceneHandle } from "../scenes/DoorScene";

export type DoorOpeningParts = DoorSceneHandle & {
  /** the cosmos layer between the two stages */
  cosmos: HTMLElement;
  /** brand bar, headline and the thought: they leave first */
  ui: HTMLElement[];
};

/** Clips the cosmos to the doorway's rectangle on screen, so it is only seen through the door. */
export function clipToDoorway(cosmos: HTMLElement, hole: HTMLElement) {
  const r = hole.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const px = (n: number) => `${Math.max(0, n).toFixed(1)}px`;
  cosmos.style.clipPath = `inset(${px(r.top)} ${px(vw - r.right)} ${px(vh - r.bottom)} ${px(r.left)})`;
}

/**
 * Scene two, about 4 seconds: the thought holds, the interface leaves, light flares at the seam,
 * the door swings inward on its left hinge with warm light pouring through, the camera eases in and then
 * falls through the doorway while the meadow sinks into midnight, and the light gives way to the stars.
 * One timeline, so Skip can fast-forward it and reverting it restores the meadow exactly.
 */
export function buildDoorOpening(p: DoorOpeningParts): gsap.core.Timeline {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const door = p.hole.getBoundingClientRect();
  const cx = door.left + door.width / 2;
  const cy = door.top + door.height / 2;
  // far enough that the doorway is larger than the screen in both directions
  const fall = Math.max(vw / door.width, vh / door.height) * 1.2;
  const dx = vw / 2 - cx;
  const dy = vh / 2 - cy;
  const follow = () => clipToDoorway(p.cosmos, p.hole);

  const tl = gsap.timeline({
    onUpdate: follow,
    defaults: { ease: "power2.inOut" },
  });
  tl.set(p.cameras, { transformOrigin: `${cx}px ${cy}px` })
    .set(p.cosmos, { autoAlpha: 1 })
    .add(follow)
    .add(p.freeze, 0.4)
    // 1. the interface leaves; the thought has had a moment to be read
    .to(
      p.ui,
      { autoAlpha: 0, y: -14, duration: 0.6, stagger: 0.08, ease: "power2.in" },
      0.5,
    )
    .to(p.scrim, { autoAlpha: 0, duration: 0.8 }, 0.6)
    // 2. the seam flares
    .to(
      p.seam,
      {
        opacity: 1,
        scaleX: 3,
        duration: 0.4,
        ease: "power2.out",
        overwrite: true,
      },
      0.6,
    )
    // 3. the door swings away from us; light behind it from the first crack
    .set(p.glow, { autoAlpha: 1 }, 0.9)
    .to(
      p.leaf,
      {
        rotationY: 82,
        transformPerspective: 900,
        transformOrigin: "0% 50%",
        duration: 1.8,
      },
      0.9,
    )
    .to(p.leaf.querySelector("span"), { opacity: 0.6, duration: 1.8 }, 0.9)
    .to(p.seam, { autoAlpha: 0, duration: 0.3 }, 1.05)
    .to(p.spill, { autoAlpha: 1, duration: 1.2, ease: "power2.out" }, 1.0)
    // 4. the camera: a slow dolly while the door opens, then a fall through the doorway
    .to(
      p.cameras,
      {
        scale: 1.2,
        x: dx * 0.2,
        y: dy * 0.2,
        duration: 1.6,
        ease: "sine.inOut",
      },
      0.9,
    )
    .to(
      p.cameras,
      { scale: fall, x: dx, y: dy, duration: 1.5, ease: "power3.in" },
      2.5,
    )
    .to(p.dusk, { autoAlpha: 0.92, duration: 1.1, ease: "power1.in" }, 2.6)
    // the stars drift toward us as we approach
    .fromTo(
      p.cosmos.querySelectorAll("[data-stars]"),
      { scale: 0.86 },
      { scale: 1, duration: 2.2, ease: "power2.out" },
      1.9,
    )
    // 5. through the light, into the night
    .to(p.glow, { "--iris": 110, duration: 0.9, ease: "power2.in" }, 3.2)
    .to(p.glow, { autoAlpha: 0, duration: 0.3 }, 3.9)
    .set(p.cameras, { autoAlpha: 0 }, 4.0)
    .set(p.cosmos, { clipPath: "none" }, 4.0);
  return tl;
}

/** The same journey without movement: the interface fades and the cosmos fades in over the meadow. */
export function buildDoorOpeningStill(p: DoorOpeningParts): gsap.core.Timeline {
  return gsap
    .timeline()
    .add(p.freeze)
    .to([...p.ui, p.scrim], { autoAlpha: 0, duration: 0.3 }, 0.3)
    .set(p.cosmos, { clipPath: "none", autoAlpha: 0 }, 0.3)
    .to(p.cosmos, { autoAlpha: 1, duration: 0.4 }, 0.4)
    .set(p.cameras, { autoAlpha: 0 });
}
