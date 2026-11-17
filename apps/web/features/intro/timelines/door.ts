import { gsap } from "@/lib/motion/gsap";
import type { IntroParams } from "../world/params";

/**
 * Phase 1 of the entry: from the click on "Unveil What Awaits" to standing in the Vibers World.
 * About 3.8 seconds. Every number here is a time in seconds from the click (the second argument
 * of each tween) or a duration; change them to retime the sequence.
 *
 *   0.00  the button steps back; the headline stays until we walk through
 *   0.15  the camera turns to the door and takes a few steps toward it      (focus)
 *   0.30  the light at the gaps brightens                                    (seam)
 *   0.10  the painted door hands over to the 3D door at the same angle       (painted)
 *   0.75  the leaf swings smoothly open on its hinge, to 90 degrees          (leaf)
 *   0.95  warm light blazes in the opening; the world beyond appears in it   (flare, glow)
 *   1.80  "A World Awaits" fades as we go
 *   1.90  the camera walks through the doorway, the lens widening a touch    (travel, warp)
 *   2.60  the light clears, leaving the Vibers World                         (flare falls)
 *   3.80  done: the Vibers World takes over the screen in a short dissolve
 */
export function buildDoorOpening(
  p: IntroParams,
  el: { copy: HTMLElement | null; button: HTMLElement | null },
  on: { entering: () => void; arrived: () => void },
) {
  const tl = gsap.timeline({ onComplete: on.arrived });
  // the button presses in and steps back; "A World Awaits" stays with us until we walk through
  if (el.button) tl.to(el.button, { autoAlpha: 0, y: 10, duration: 0.45, ease: "power2.in" }, 0.05);
  if (el.copy) tl.to(el.copy, { autoAlpha: 0, y: -14, duration: 0.6, ease: "power2.in" }, 1.8);
  tl.to(p, { focus: 1, duration: 1.7, ease: "power2.inOut" }, 0.15)
    .to(p, { seam: 1, duration: 0.5, ease: "power1.out" }, 0.3)
    .to(p, { life: 0.5, duration: 1.2, ease: "none" }, 0.3)
    // the painted door hands over to the 3D one, standing at the same angle, as the camera moves
    .to(p, { painted: 0, duration: 0.35, ease: "power1.inOut" }, 0.1)
    .to(p, { leaf: 1, duration: 1.9, ease: "sine.inOut" }, 0.7)
    .to(p, { flare: 1, duration: 0.8, ease: "power2.out" }, 0.95)
    .to(p, { glow: 1, duration: 1.1, ease: "power1.inOut" }, 1.0)
    .call(on.entering, [], 1.9)
    .to(p, { travel: 1, duration: 1.9, ease: "power2.inOut" }, 1.9)
    .to(p, { warp: 12, duration: 0.9, ease: "power2.in" }, 1.9)
    .to(p, { warp: 0, duration: 1.0, ease: "power2.out" }, 2.8)
    .to(p, { flare: 0, duration: 1.2, ease: "power1.inOut" }, 2.6);
  return tl;
}
