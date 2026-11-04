import { gsap } from "@/lib/motion/gsap";
import type { World } from "../world/engine";
import { ORB_START, SPIN_ARRIVE, SPIN_DOOR } from "./discovery";

/**
 * Scene two in 3D, about 5 seconds. The thought holds; the interface leaves; light flares at the seam;
 * the door swings away from us with light pouring through and shafts of it reaching across the grass;
 * the camera eases forward, then rushes through the doorway as the meadow sinks into midnight; the light
 * opens from the centre and we are among the stars.
 */
export function buildWorldOpening(
  world: World,
  ui: HTMLElement[],
): gsap.core.Timeline {
  const p = world.params;
  return (
    gsap
      .timeline({ defaults: { ease: "power2.inOut" } })
      // the orb is already there behind the door, turning fast; we see it through the doorway
      .set(p, { planet: ORB_START, planetY: 0 }, 0)
      .fromTo(
        p,
        { spin: SPIN_DOOR },
        { spin: SPIN_ARRIVE, duration: 5.8, ease: "none" },
        0,
      )
      // 1. the thought has its moment, then the interface steps away
      .to(
        ui,
        {
          autoAlpha: 0,
          y: -14,
          duration: 0.6,
          stagger: 0.08,
          ease: "power2.in",
        },
        0.5,
      )
      .to(p, { life: 0.35, lookX: 0, lookY: 0, duration: 1.2 }, 0.4)
      // 2. the seam flares
      .to(p, { seam: 1, duration: 0.45, ease: "power2.out" }, 0.6)
      // 3. the door unlatches (a small give), then swings away with weight: slow to start, carried
      // through, easing as it reaches the wall. Light pours through from the first crack
      .to(p, { leaf: 0.025, duration: 0.3, ease: "power2.out" }, 0.8)
      .to(p, { leaf: 1, duration: 2.3, ease: "power3.inOut" }, 1.05)
      .to(p, { light: 1, duration: 0.6, ease: "power2.out" }, 1.0)
      .to(p, { seam: 0, duration: 0.5 }, 1.3)
      .to(p, { rays: 1, duration: 1.6, ease: "power2.out" }, 1.05)
      // 4. one unbroken push: a slow step forward while it opens, gathering into the rush through
      .to(p, { travel: 1, duration: 3.5, ease: "power2.in" }, 0.9)
      .to(p, { warp: 16, duration: 0.9, ease: "power2.in" }, 3.35)
      .to(p, { dusk: 1, duration: 1.7, ease: "sine.in" }, 2.5)
      // 5. through the light: it opens from the centre, and the shafts fall away
      // the glow thins from the centre as we near, so the stars show through before we cross
      .to(p, { iris: 0.3, duration: 1.4, ease: "sine.inOut" }, 1.9)
      .to(p, { iris: 1.25, duration: 0.8, ease: "power2.in" }, 3.3)
      .to(p, { rays: 0, duration: 0.5 }, 3.7)
      // 6. among the stars, the lens settles
      .to(p, { warp: 0, duration: 1.4, ease: "power2.out" }, 4.4)
  );
}
