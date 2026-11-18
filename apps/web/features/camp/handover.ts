/**
 * The hand-over from the camp to Home (ARPIT, 2026-11-18: "transitions to the home page cleanly"). When
 * the paraglider's canopy covers the screen, the camp copies that frame here and moves on to /home; the
 * frame stays laid over everything (components/handover/Handover.tsx) until Home's pictures are ready,
 * then the canopy sweeps up over our heads and away, uncovering Home with no blank or dark frame and
 * no cross-fade (ARPIT found the fade cheap).
 */
type Shot = { frame: HTMLCanvasElement; ready: Promise<unknown> };

let shot: Shot | null = null;
const subs = new Set<() => void>();

export const handover = {
  show(frame: HTMLCanvasElement, ready: Promise<unknown>) {
    shot = { frame, ready };
    subs.forEach((f) => f());
  },
  take(): Shot | null {
    const s = shot;
    shot = null;
    return s;
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => void subs.delete(f);
  },
};

/** Home's opening pictures, loaded and decoded, so the first frame of Home is complete. */
export const HOME_PICTURES = ["/home/scene.webp", "/home/viber-girl.webp", "/home/viber-boy.webp"];
export function preloadHome() {
  return Promise.all(
    HOME_PICTURES.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => {});
    }),
  );
}
