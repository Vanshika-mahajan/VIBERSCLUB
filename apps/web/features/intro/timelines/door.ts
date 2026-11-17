import { gsap } from "@/lib/motion/gsap";
import type { IntroParams } from "../world/params";

/**
 * Phase 1 of the entry: from the click on "Unveil What Awaits" to standing in the Vibers World.
 * About 3.8 seconds. Every number here is a time in seconds from the click (the second argument
 * of each tween) or a duration; change them to retime the sequence.
 *
 *   0.00  the headline and button step back
 *   0.15  the camera turns to the door and takes a few steps toward it      (focus)
 *   0.30  the light at the gaps brightens                                    (seam)
 *   0.75  the latch gives a little, then the leaf swings open on its hinge   (leaf)
 *   0.95  warm light blazes in the opening; the world beyond appears in it   (flare, glow)
 *   1.90  the camera walks through the doorway, the lens widening a touch    (travel, warp)
 *   2.60  the light clears, leaving the Vibers World                         (flare falls)
 *   3.80  done: the Vibers World takes over the screen in a short dissolve
 */
export function buildDoorOpening(
  p: IntroParams,
  el: { copy: HTMLElement | null },
  on: { entering: () => void; arrived: () => void },
) {
  const tl = gsap.timeline({ onComplete: on.arrived });
  if (el.copy)
    tl.to(
      el.copy,
      { autoAlpha: 0, y: -18, duration: 0.7, ease: "power2.in" },
      0,
    );
  tl.to(p, { focus: 1, duration: 1.7, ease: "power2.inOut" }, 0.15)
    .to(p, { seam: 1, duration: 0.5, ease: "power1.out" }, 0.3)
    .to(p, { life: 0.5, duration: 1.2, ease: "none" }, 0.3)
    // the latch: a small give before the swing
    .to(p, { leaf: 0.025, duration: 0.18, ease: "power2.out" }, 0.75)
    .to(p, { leaf: 1, duration: 1.75, ease: "power3.inOut" }, 0.95)
    .to(p, { flare: 1, duration: 0.8, ease: "power2.out" }, 0.95)
    .to(p, { glow: 1, duration: 1.1, ease: "power1.inOut" }, 1.0)
    .call(on.entering, [], 1.9)
    .to(p, { travel: 1, duration: 1.9, ease: "power2.inOut" }, 1.9)
    .to(p, { warp: 12, duration: 0.9, ease: "power2.in" }, 1.9)
    .to(p, { warp: 0, duration: 1.0, ease: "power2.out" }, 2.8)
    .to(p, { flare: 0, duration: 1.2, ease: "power1.inOut" }, 2.6);
  return tl;
}
