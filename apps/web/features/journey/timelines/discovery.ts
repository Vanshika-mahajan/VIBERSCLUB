import { gsap } from "@/lib/motion/gsap";
import type { Phase } from "../useJourney";
import type { DiscoveryHandle } from "../scenes/Discovery";
import { planetOnScreen, type WorldParams } from "../world/params";

const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** the orb's size when we first see it, through the doorway */
export const ORB_START = 0.55;
/**
 * Its spin, in radians still to turn before Manali faces us. Through the door it turns about once a
 * second; from the cosmos it slows (power3.out starts at the same speed) until Manali comes round.
 */
export const SPIN_ARRIVE = TAU * 1.45;
export const SPIN_DOOR = SPIN_ARRIVE + 6 * 5.8;
const SPIN_SLOW = 4.6;

/** where the sphere ends up once the cards have settled */
const SETTLED = { planet: 0.34, planetY: 0.36 };

/**
 * Scenes three to five, about 12 seconds after the door. Everything moves by tweening the shared
 * params; the 3D world and the driver below both read them, so the CSS and 3D versions stay in step.
 *
 *  0.0  the orb, already in view through the door, turns fast and slows (milestones 4 and 5)
 *  3.4  the camera dives toward Manali, the surface turns into the valley, the marker lights (6)
 *  6.6  back out; the Vibers appear and orbit the sphere, slowing (7)
 * 10.0  they settle into the row, the heading and the way onward appear (8)
 */
export function buildDiscovery(
  p: WorldParams,
  d: DiscoveryHandle,
  advance: (to: Phase) => void,
): gsap.core.Timeline {
  const extras = [
    d.more,
    d.root.querySelector<HTMLElement>("[class*=sample]")!,
  ];
  return (
    gsap
      .timeline({ defaults: { ease: "power2.inOut" } })
      .set(d.root, { autoAlpha: 1 }, 0)
      // the orb is already here (seen through the door); it keeps turning fast, then slows for Manali
      .fromTo(
        p,
        { planet: ORB_START, planetY: 0 },
        { planet: 0.78, duration: 3.4, ease: "sine.inOut" },
        0,
      )
      .fromTo(
        p,
        { spin: SPIN_ARRIVE },
        { spin: 0, duration: SPIN_SLOW, ease: "power3.out" },
        0,
      )
      .call(() => advance("manali"), undefined, 3.4)
      .to(p, { planet: 2.6, duration: 2.3 }, 3.4)
      .to(p, { manali: 1, duration: 1.5, ease: "sine.inOut" }, 3.9)
      .to(p, { marker: 1, duration: 0.8, ease: "power2.out" }, 5.0)
      .call(() => advance("orbit"), undefined, 6.6)
      .to(p, { planet: 0.62, duration: 1.9 }, 6.6)
      .fromTo(
        p,
        { orbit: -0.6 },
        { orbit: TAU * 0.9, duration: 4.6, ease: "power2.out" },
        6.9,
      )
      .to(p, { cards: 1, duration: 1.6, ease: "power2.out" }, 7.2)
      .to(p, { ...SETTLED, duration: 1.7 }, 10.0)
      .to(p, { settle: 1, duration: 1.6, ease: "none" }, 10.1)
      .fromTo(
        d.head,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: "power2.out" },
        10.6,
      )
      .fromTo(extras, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 }, 11.3)
  );
}

/** Reduced motion: no flight, no orbit. The result is simply there, with Manali marked. */
export function buildDiscoveryStill(
  p: WorldParams,
  d: DiscoveryHandle,
): gsap.core.Timeline {
  const extras = [
    d.more,
    d.root.querySelector<HTMLElement>("[class*=sample]")!,
  ];
  return gsap
    .timeline()
    .set(p, {
      ...SETTLED,
      spin: 0,
      manali: 1,
      marker: 1,
      cards: 1,
      orbit: 0,
      settle: 1,
    })
    .fromTo(d.root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 })
    .set([d.head, ...extras], { autoAlpha: 1 }, "<");
}

/**
 * Every frame from the cosmos on: places the CSS sphere (when there is no 3D world), the Manali
 * label at the marker, and each card on its orbit or on its way to its place in the row. Cards
 * behind the sphere dim and soften. Once settled, the cards are left alone so the row scrolls.
 */
export function makeDriver(
  p: WorldParams,
  d: DiscoveryHandle,
  world3d: boolean,
) {
  let natural: { x: number; y: number; w: number }[] = [];
  let measured = "";
  let released = false;

  const measure = () => {
    for (const el of d.items) el.style.transform = "";
    natural = d.items.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
    });
  };

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
      opacity: p.marker * (1 - p.settle),
    });

    if (p.settle >= 1) {
      if (!released) {
        gsap.set(d.items, { clearProps: "transform,opacity,zIndex,filter" });
        released = true;
      }
      return;
    }
    released = false;
    const key = `${W}x${H}x${d.items.length}`;
    if (key !== measured) {
      measure();
      measured = key;
    }

    const n = d.items.length;
    const cardW = natural[0]?.w ?? 240;
    const rx = Math.max(
      Math.min(c.r * 1.8 + cardW * 0.2, W / 2 - cardW * 0.22),
      40,
    );
    const ry = Math.max(c.r * 0.42, 36);
    // in orbit a card is about a sixth of the screen's shorter side
    const orbitScale = Math.min(
      Math.max((Math.min(W, H) * 0.17) / cardW, 0.28),
      0.55,
    );
    d.items.forEach((el, i) => {
      const at = natural[i];
      if (!at) return;
      const a = p.orbit + (i * TAU) / n;
      const depth = Math.sin(a); // 1 = in front of the sphere, -1 = behind it
      const ox = c.x + rx * Math.cos(a);
      const oy = c.y + ry * depth;
      const appear = smooth(clamp01(p.cards * (n * 0.5 + 1) - i * 0.5));
      const behind = depth < 0 && Math.abs(ox - c.x) < c.r * 0.9;
      const scale = orbitScale * (0.78 + 0.22 * (depth + 1) * 0.5);
      // settle in a wave from the first card to the last
      const s = smooth(
        clamp01(p.settle * 1.6 - (i / Math.max(n - 1, 1)) * 0.6),
      );
      gsap.set(el, {
        x: lerp(ox - at.x, 0, s),
        y: lerp(oy - at.y, 0, s),
        scale: lerp(scale * (0.6 + 0.4 * appear), 1, s),
        opacity: lerp((behind ? 0.28 : 1) * appear, 1, s),
        zIndex: s > 0.4 ? 20 + i : Math.round((depth + 1) * 5),
        filter: behind && s < 0.4 ? "blur(1.5px)" : "none",
      });
    });
  };
}
