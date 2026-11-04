import { gsap } from "@/lib/motion/gsap";
import type { Phase } from "../useJourney";
import type { DiscoveryHandle } from "../scenes/Discovery";
import { planetOnScreen, type WorldParams } from "../world/params";

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const smooth = (x: number) => x * x * (3 - 2 * x);

/** the orb's size when we first see it, through the doorway */
export const ORB_START = 0.55;
/**
 * Its spin, in radians still to turn before Manali faces us. Through the door it turns about once a
 * second; from the cosmos it slows (power3.out starts at the same speed) until Manali comes round.
 */
export const SPIN_ARRIVE = TAU * 1.45;
export const SPIN_DOOR = SPIN_ARRIVE + 6 * 5.8;
const SPIN_SLOW = 4.6;

/** how far the dive goes: the sphere's radius grows to this many times the start (exponential, so the
 * zoom feels like one steady fall toward the valley) */
const DIVE_FROM = 0.78;
const DIVE_TO = 7;

/**
 * Scenes three and four, about 8 seconds after the door. Everything moves by tweening the shared
 * params; the 3D world and the driver below both read them, so the CSS and 3D versions stay in step.
 *
 *  0.0  the orb, already in view through the door, turns fast and slows (milestones 4 and 5)
 *  3.4  the camera dives toward Manali and never pulls back: the surface turns into the valley, the
 *       marker lights, and we keep falling in until the valley fills the screen
 *  6.9  the valley gives way to warm light, and the club home takes over (onArrive)
 */
export function buildDiscovery(
  p: WorldParams,
  d: DiscoveryHandle,
  advance: (to: Phase) => void,
): gsap.core.Timeline {
  const dive = { t: 0 };
  return (
    gsap
      .timeline({ defaults: { ease: "power2.inOut" } })
      .set(d.root, { autoAlpha: 1 }, 0)
      // the orb is already here (seen through the door); it keeps turning fast, then slows for Manali
      .fromTo(
        p,
        { planet: ORB_START, planetY: 0 },
        { planet: DIVE_FROM, duration: 3.4, ease: "sine.inOut" },
        0,
      )
      .fromTo(
        p,
        { spin: SPIN_ARRIVE },
        { spin: 0, duration: SPIN_SLOW, ease: "power3.out" },
        0,
      )
      .call(() => advance("manali"), undefined, 3.4)
      // one continuous pinch in: starts gently where the sphere already is, then keeps falling
      .fromTo(
        dive,
        { t: 0 },
        {
          t: 1,
          duration: 4.4,
          ease: "power1.in",
          onUpdate: () => {
            p.planet = DIVE_FROM * Math.pow(DIVE_TO / DIVE_FROM, dive.t);
          },
        },
        3.4,
      )
      .to(p, { manali: 1, duration: 1.6, ease: "sine.inOut" }, 3.7)
      .to(p, { marker: 1, duration: 0.7, ease: "power2.out" }, 4.6)
      .to(p, { marker: 0, duration: 0.8, ease: "power1.in" }, 6.1)
      // warm light rises out of the valley; the home page is waiting underneath it
      .call(() => advance("arrive"), undefined, 6.9)
      .fromTo(
        d.arrive,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.9, ease: "sine.in" },
        6.9,
      )
  );
}

/** Reduced motion: no flight. Manali is simply there, then the light takes us home. */
export function buildDiscoveryStill(
  p: WorldParams,
  d: DiscoveryHandle,
  advance: (to: Phase) => void,
): gsap.core.Timeline {
  return gsap
    .timeline()
    .set(p, { planet: 1.4, planetY: 0, spin: 0, manali: 1, marker: 1 })
    .fromTo(d.root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 })
    .call(() => advance("arrive"), undefined, 1.8)
    .fromTo(d.arrive, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 1.8);
}

/**
 * Every frame from the cosmos on: places the CSS sphere (when there is no 3D world) and the Manali
 * label at the marker.
 */
export function makeDriver(
  p: WorldParams,
  d: DiscoveryHandle,
  world3d: boolean,
) {
  return () => {
    const W = d.root.clientWidth;
    const H = d.root.clientHeight;
    if (!W || !H) return;
    const c = planetOnScreen(p, W, H);

    if (!world3d) {
      // the image is the sphere plus its halo: the sphere fills 1/1.3 of it
      const size = c.r * 2 * 1.3;
      gsap.set(d.planet, {
        x: c.x - size / 2,
        y: c.y - size / 2,
        width: size,
        height: size,
        rotation: (p.spin * 180) / Math.PI / 24,
        opacity: clamp01(p.planet * 12),
      });
      const close = p.manali * smooth(clamp01((p.planet - 1.1) / 0.9));
      gsap.set(d.valley, {
        x: c.x - c.r,
        y: c.y - c.r,
        width: c.r * 2,
        height: c.r * 2,
        opacity: close,
      });
    }

    gsap.set(d.place, {
      x: c.x,
      y: c.y + 24,
      xPercent: -50,
      opacity: p.marker,
    });
  };
}
