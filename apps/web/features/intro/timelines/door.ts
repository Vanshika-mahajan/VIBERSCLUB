import { gsap } from "@/lib/motion/gsap";
import type { IntroParams } from "../world/params";

/**
 * Phase 1 of the entry: from the click on "Unveil What Awaits" to standing in the Vibers World.
 * About 2.5 seconds. Every number here is a time in seconds from the click (the second argument
 * of each tween) or a duration; change them to retime the sequence.
 *
 * Framed like ARPIT's reference: the camera glides round to stand square in front of the door, centred
 * on it, while the door swings open onto the Vibers World; then one quick, accelerating push straight
 * in through the doorway, and the world settles into place.
 *
 *   0.00  the button steps back; the headline stays until we go through
 *   0.05  the painted door hands over to the 3D door at the same angle       (painted)
 *   0.20  the light at the gaps brightens                                    (seam)
 *   0.30  the camera glides to stand square in front of the door, centred    (focus)
 *   0.45  the Vibers World comes up in the gap                               (glow)
 *   0.55  the leaf swings smoothly open on its hinge, to 90 degrees          (leaf)
 *   1.45  "A World Awaits" fades
 *   1.70  the push, straight in through the doorway, faster and faster      (travel, warp)
 *   2.50  done: the Vibers World takes over and settles (IntroExperience)
 */
export function buildDoorOpening(
  p: IntroParams,
  el: { copy: HTMLElement | null; button: HTMLElement | null },
  on: { entering: () => void; arrived: () => void },
) {
  const tl = gsap.timeline({ onComplete: on.arrived });
  // the button presses in and steps back; "A World Awaits" stays with us until we go through
  if (el.button) tl.to(el.button, { autoAlpha: 0, y: 10, duration: 0.45, ease: "power2.in" }, 0.05);
  if (el.copy) tl.to(el.copy, { autoAlpha: 0, y: -14, duration: 0.45, ease: "power2.in" }, 1.45);
  // the painted door hands over to the 3D one before the camera moves, so the change is exact
  tl.to(p, { painted: 0, duration: 0.25, ease: "power1.inOut" }, 0.05)
    .to(p, { seam: 1, duration: 0.4, ease: "power1.out" }, 0.2)
    .to(p, { life: 0.5, duration: 1.0, ease: "none" }, 0.3)
    // the camera comes round to face the door square on, centred, as in the reference
    .to(p, { focus: 1, duration: 1.2, ease: "power2.inOut" }, 0.3)
    .to(p, { glow: 1, duration: 0.35, ease: "power1.inOut" }, 0.45)
    .to(p, { leaf: 1, duration: 1.2, ease: "power2.inOut" }, 0.55)
    .to(p, { flare: 0.35, duration: 0.8, ease: "power2.out" }, 0.6)
    .call(on.entering, [], 1.7)
    // one quick push straight in, accelerating all the way, like a dolly rushing through the doorway
    .to(p, { travel: 1, duration: 0.8, ease: "power3.in" }, 1.7)
    .to(p, { warp: 10, duration: 0.8, ease: "power3.in" }, 1.7)
    .to(p, { flare: 0.7, duration: 0.8, ease: "power3.in" }, 1.7);
  return tl;
}
