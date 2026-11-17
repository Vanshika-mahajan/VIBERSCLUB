import { gsap } from "@/lib/motion/gsap";
import type { IntroParams } from "../world/params";

/**
 * Phase 1 of the entry: from the click on "Unveil What Awaits" to standing in the Vibers World.
 * About 2.6 seconds. Every number here is a time in seconds from the click (the second argument
 * of each tween) or a duration; change them to retime the sequence.
 *
 * Shaped on ARPIT's reference: the camera settles, the door swings open and warm light spills out,
 * then one quick, accelerating push straight through the doorway, and the world settles into place.
 *
 *   0.00  the button steps back; the headline stays until we go through
 *   0.10  the painted door hands over to the 3D door at the same angle       (painted)
 *   0.15  the camera turns to the door and eases a little closer             (focus)
 *   0.30  the light at the gaps brightens                                    (seam)
 *   0.45  the leaf swings smoothly open on its hinge, to 90 degrees          (leaf)
 *   0.65  warm light spills out; the world beyond appears in the opening     (flare, glow)
 *   1.60  "A World Awaits" fades
 *   1.85  the push: the camera rushes through the doorway, faster and faster (travel, warp)
 *   2.60  done: the Vibers World takes over and settles (IntroExperience)
 */
export function buildDoorOpening(
  p: IntroParams,
  el: { copy: HTMLElement | null; button: HTMLElement | null },
  on: { entering: () => void; arrived: () => void },
) {
  const tl = gsap.timeline({ onComplete: on.arrived });
  // the button presses in and steps back; "A World Awaits" stays with us until we go through
  if (el.button) tl.to(el.button, { autoAlpha: 0, y: 10, duration: 0.45, ease: "power2.in" }, 0.05);
  if (el.copy) tl.to(el.copy, { autoAlpha: 0, y: -14, duration: 0.5, ease: "power2.in" }, 1.6);
  tl.to(p, { focus: 1, duration: 1.4, ease: "power2.inOut" }, 0.15)
    .to(p, { seam: 1, duration: 0.4, ease: "power1.out" }, 0.3)
    .to(p, { life: 0.5, duration: 1.0, ease: "none" }, 0.3)
    // the painted door hands over to the 3D one, standing at the same angle, as the camera moves
    .to(p, { painted: 0, duration: 0.35, ease: "power1.inOut" }, 0.1)
    .to(p, { leaf: 1, duration: 1.4, ease: "sine.inOut" }, 0.45)
    .to(p, { flare: 0.45, duration: 0.8, ease: "power2.out" }, 0.65)
    .to(p, { glow: 1, duration: 0.9, ease: "power1.inOut" }, 0.7)
    .call(on.entering, [], 1.85)
    // one quick push, accelerating all the way, like a dolly rushing through the doorway
    .to(p, { travel: 1, duration: 0.75, ease: "power3.in" }, 1.85)
    .to(p, { warp: 10, duration: 0.75, ease: "power3.in" }, 1.85)
    .to(p, { flare: 0.7, duration: 0.75, ease: "power3.in" }, 1.85);
  return tl;
}
