/**
 * Where a point of the Vibers World painting lands on the screen. The painting covers the screen
 * (like CSS object-fit: cover), then drifts closer toward FOCUS by `push` and shifts a hair with the
 * pointer. world/living.ts draws it with exactly this mapping, so DOM layers (the paraglider) can sit
 * on the painting precisely.
 */

export const WORLD = { w: 1671, h: 941 };
export const FOCUS = { x: 0.52, y: 0.48 };
/** how much closer the view drifts at push = 1 */
export const PUSH_ZOOM = 0.06;
/** how far the pointer shifts the view, as a share of the painting */
export const LOOK = 0.006;

export type View = { push: number; lookX: number; lookY: number };

/** painting pixels (from the top left) to screen pixels, for a screen of width x height */
export function worldToScreen(
  px: number,
  py: number,
  width: number,
  height: number,
  view: View = { push: 0, lookX: 0, lookY: 0 },
) {
  const aspect = WORLD.w / WORLD.h;
  const a = width / height;
  const zoom = 1 + PUSH_ZOOM * view.push;
  // the shader's texture coordinates run up from the bottom
  const u = px / WORLD.w;
  const v = 1 - py / WORLD.h;
  const u0 = (u - 0.5 - (FOCUS.x - 0.5) * (1 - 1 / zoom) - view.lookX * LOOK) * zoom + 0.5;
  const v0 = (v - 0.5 - (FOCUS.y - 0.5) * (1 - 1 / zoom) - view.lookY * LOOK) * zoom + 0.5;
  let sx = u0,
    sy = v0;
  if (a > aspect) sy = (v0 - 0.5) * (a / aspect) + 0.5;
  else sx = (u0 - 0.5) * (aspect / a) + 0.5;
  return { x: sx * width, y: (1 - sy) * height, scale: zoom * (a > aspect ? width / WORLD.w : height / WORLD.h) };
}
