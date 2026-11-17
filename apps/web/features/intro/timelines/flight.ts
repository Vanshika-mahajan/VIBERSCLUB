import { gsap } from "@/lib/motion/gsap";
import { worldToScreen, type View } from "../world/cover";

/** the painted paraglider's place in the Vibers World (painting pixels): the real one starts there */
export const GLIDER_START = { left: 1130.5, top: 54.2, width: 83.6 };
/** the sprite (paraglider.webp) is 1672 x 941; its canopy's middle band sits at this share of its height */
const SPRITE = { aspect: 1672 / 941, canopyMid: 0.17 };

/**
 * Phases 4 to 6 on the entry's side, about 5.5 seconds from the moment the Vibers World is shown.
 * Every number is a time in seconds from the start (the last argument of each tween) or a duration.
 *
 *   0.0   the Vibers World lives on its own for a moment
 *   2.6   the paraglider in the sky lifts off the picture and glides across, banking   (paraglider)
 *   4.3   it swoops down toward us; its canopy sweeps overhead and fills the screen     (canopy)
 *   5.5   the canopy's cloth fills the screen and ripples in the wind
 *   6.4   done: the site takes over (Home opens the canopy like a curtain; see CanopyReveal)
 */
export function buildFlight(
  el: { glider: HTMLElement; fabric: HTMLElement },
  view: () => View,
  on: { paraglider: () => void; canopy: () => void; hideGlider: () => void; covered: () => void },
) {
  const W = window.innerWidth,
    H = window.innerHeight;
  // where the painted paraglider is on this screen, right now
  const v = view();
  const a = worldToScreen(GLIDER_START.left, GLIDER_START.top, W, H, v);
  const w0 = GLIDER_START.width * a.scale;
  // a phone shows only the middle of the picture: the glider may start just off the right edge
  const start = { x: a.x, y: a.y, w: w0 };
  // across the sky, a little lower and nearer (larger)
  const mid = { x: Math.min(W * 0.62, start.x - W * 0.18), y: H * 0.12, w: Math.max(w0 * 3.2, W * 0.22) };
  // overhead: the canopy spans far past both edges, its middle band across the middle of the screen
  const endW = Math.max(W, H * SPRITE.aspect) * 4.2;
  const end = { x: W / 2 - endW / 2, y: H / 2 - (endW / SPRITE.aspect) * SPRITE.canopyMid, w: endW };

  const g = el.glider;
  gsap.set(g, { x: start.x, y: start.y, width: start.w, rotation: 0, autoAlpha: 0, filter: "blur(0px)" });
  const tl = gsap.timeline();
  tl.call(on.paraglider, [], 2.6)
    // the real glider appears exactly over the painted one, which steps out of the picture
    .set(g, { autoAlpha: 1 }, 2.6)
    .call(on.hideGlider, [], 2.62)
    .to(g, { x: mid.x, y: mid.y, width: mid.w, duration: 1.7, ease: "sine.inOut" }, 2.6)
    .to(g, { rotation: -7, duration: 0.9, ease: "sine.inOut" }, 2.6)
    .to(g, { rotation: 3, duration: 0.8, ease: "sine.inOut" }, 3.5)
    .call(on.canopy, [], 4.3)
    // the swoop: it grows fast as it comes over our heads, a little motion blur at the end
    .to(g, { x: end.x, y: end.y, width: end.w, duration: 1.2, ease: "power3.in" }, 4.3)
    .to(g, { rotation: 0, duration: 1.2, ease: "power1.inOut" }, 4.3)
    .to(g, { filter: "blur(3px)", duration: 0.4, ease: "power1.in" }, 5.1)
    // the cloth takes over: the canopy fills the screen and ripples
    .fromTo(el.fabric, { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power1.out" }, 5.25)
    .set(g, { autoAlpha: 0 }, 5.75)
    .call(on.covered, [], 6.4);
  return tl;
}
