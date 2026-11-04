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
});

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
