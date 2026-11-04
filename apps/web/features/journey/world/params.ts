import { DOOR, EYE_HEIGHT, FLIGHT_END_Z, LEAF_CENTER_Y, PITCH } from "./layout";

/**
 * Everything the opening timeline animates. Plain numbers: GSAP tweens them, the engine reads them
 * every frame. Nothing here touches React.
 */
export type WorldParams = {
  /** 0 = where the photo was taken, 1 = through the doorway and into the cosmos */
  travel: number;
  /** extra lens width for the rush through the door, degrees */
  warp: number;
  /** 0 closed … 1 fully open (82°) */
  leaf: number;
  /** light along the seam before the door opens */
  seam: number;
  /** light filling the doorway (HDR, so it blooms) */
  light: number;
  /** shafts of light reaching toward us, and the light on the grass */
  rays: number;
  /** the light opens from the centre as we pass through: -0.4 = all light, 1.2 = all cosmos */
  iris: number;
  /** the meadow sinks into midnight */
  dusk: number;
  /** mouse parallax, -1 … 1, already eased */
  lookX: number;
  lookY: number;
  /** idle life: camera breathing, grass wind, pollen. 0 stops it */
  life: number;

  // ---- in the cosmos (both the 3D and the CSS version read these) ----
  /** the sphere's radius on screen, as a share of half the screen's shorter side; 0 hides it */
  planet: number;
  /** the sphere's centre above the screen's centre, as a share of half the screen's height */
  planetY: number;
  /** extra turns still to spin, radians; 0 = Manali faces us */
  spin: number;
  /** 0 globe … 1 the surface around Manali drawn as the valley */
  manali: number;
  /** the glowing marker on Manali */
  marker: number;
  /** the profile cards appear around the sphere, 0 … 1 */
  cards: number;
  /** where the cards are on their orbit, radians */
  orbit: number;
  /** 0 orbiting … 1 settled into the row */
  settle: number;
};

export const initialParams = (): WorldParams => ({
  travel: 0,
  warp: 0,
  leaf: 0,
  seam: 0.35,
  light: 0,
  rays: 0,
  iris: -0.4,
  dusk: 0,
  lookX: 0,
  lookY: 0,
  life: 1,
  planet: 0,
  planetY: 0,
  spin: 0,
  manali: 0,
  marker: 0,
  cards: 0,
  orbit: 0,
  settle: 0,
});

/** Where the sphere sits on a w × h screen, in CSS pixels (the 3D and CSS versions agree on this). */
export function planetOnScreen(p: WorldParams, w: number, h: number) {
  return {
    x: w / 2,
    y: h / 2 - (p.planetY * h) / 2,
    r: (p.planet * Math.min(w, h)) / 2,
  };
}

/** The flight path: forward to the doorway's centre, levelling the gaze on the way. */
export function cameraAt(travel: number) {
  const t = Math.min(Math.max(travel, 0), 1);
  return {
    x: DOOR.x * t,
    y: EYE_HEIGHT + (LEAF_CENTER_Y - EYE_HEIGHT) * t,
    z: FLIGHT_END_Z * t,
    pitch: PITCH * (1 - t),
  };
}
