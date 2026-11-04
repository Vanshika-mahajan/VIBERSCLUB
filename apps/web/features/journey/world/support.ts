/**
 * Whether this device gets the 3D journey. Otherwise the layered CSS version plays, which works
 * everywhere. Reduced motion always gets the CSS version, without movement.
 */
export function canUse3D(): boolean {
  if (typeof window === "undefined") return false;
  // reduced motion always wins, even over ?world=3d
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    return false;
  const choice = worldChoice();
  if (choice === "css") return false;
  if (choice === "3d") return hasWebGL2();
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 2) return false;
  return hasWebGL2();
}

/** `?world=3d` or `?world=css` picks a version by hand, for reviews and tests; otherwise "auto". */
export function worldChoice(): "3d" | "css" | "auto" {
  const v = new URLSearchParams(window.location.search).get("world");
  return v === "3d" || v === "css" ? v : "auto";
}

/** Frames per second the page actually reaches over `ms`, with the world already drawing. */
export function measureFps(ms = 900): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - start < ms) requestAnimationFrame(tick);
      else resolve((frames * 1000) / (now - start));
    };
    requestAnimationFrame(tick);
  });
}

/** The 3D journey needs at least this many frames per second; below it the CSS version plays. */
export const MIN_FPS = 24;

function hasWebGL2(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    return !!gl;
  } catch {
    return false;
  }
}
