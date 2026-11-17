import { gsap } from "@/lib/motion/gsap";
import type { IntroParams } from "../world/params";

/**
 * Phase 1 of the entry: from the click on "Unveil What Awaits" to standing in the Vibers World.
 * About 2.5 seconds. Every number here is a time in seconds from the click (the second argument
 * of each tween) or a duration; change them to retime the sequence.
 *
 * Framed like ARPIT's reference: the door stands closed, light glowing at its gaps. The camera glides
 * round to face it square on, centred, as it swings open toward us onto a dark brown room (the
 * reference's room is pink); then one quick, accelerating push straight in through the doorway, the
 * Vibers World coming up out of the brown as we go, and the world settles into place.
 *
 *   0.00  the button steps back; the headline stays until we go through
 *   0.20  the light at the gaps brightens                                    (seam, flare)
 *   0.30  the camera glides to stand square in front of the door, centred    (focus)
 *   0.45  the leaf swings smoothly open toward us, to 90 degrees             (leaf)
 *   1.45  "A World Awaits" fades
 *   1.70  the push, straight in through the doorway, faster and faster      (travel, warp)
 *   2.15  the Vibers World comes up out of the brown room                   (glow)
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
  tl.to(p, { seam: 1, duration: 0.4, ease: "power1.out" }, 0.2)
    .to(p, { flare: 0.2, duration: 0.6, ease: "power2.out" }, 0.2)
    .to(p, { life: 0.5, duration: 1.0, ease: "none" }, 0.3)
    // the camera comes round to face the door square on, centred, as in the reference
    .to(p, { focus: 1, duration: 1.2, ease: "power2.inOut" }, 0.3)
    .to(p, { leaf: 1, duration: 1.3, ease: "power2.inOut" }, 0.45)
    .call(on.entering, [], 1.7)
    // one quick push straight in, accelerating all the way, like a dolly rushing through the doorway
    .to(p, { travel: 1, duration: 0.8, ease: "power3.in" }, 1.7)
    .to(p, { warp: 10, duration: 0.8, ease: "power3.in" }, 1.7)
    .to(p, { flare: 0, duration: 0.5, ease: "power1.in" }, 1.7)
    // inside, the brown room gives way to the Vibers World
    .to(p, { glow: 1, duration: 0.35, ease: "power1.inOut" }, 2.15);
  return tl;
}
