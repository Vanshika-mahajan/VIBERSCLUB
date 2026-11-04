/**
 * The meadow photo rebuilt as a place. The numbers come from the photo itself:
 * horizon 59.5% down, the door's base 76.9% down, its top 39.2% down, 13.9% of the width wide,
 * centred 49.4% across. With a 40° lens at eye height 1.6 m, that puts the door 12.9 m away,
 * 2.32 m wide and 3.54 m tall (including the grass on its cornice).
 */
export const PHOTO_ASPECT = 1672 / 941;
export const PHOTO_FOV = 40; // vertical, degrees
export const EYE_HEIGHT = 1.6;
/** the photographer looked up slightly: horizon sits 9.5% below the centre */
export const PITCH = Math.atan(
  0.19 * Math.tan((PHOTO_FOV / 2) * (Math.PI / 180)),
);

export const DOOR = {
  z: -12.9,
  x: -0.1,
  width: 2.32,
  height: 3.54,
};

/** the leaf inside the frame image, as fractions of the trimmed door image (same as the CSS version) */
const LEAF_FRAC = { left: 0.1794, top: 0.1222, width: 0.6364, height: 0.8023 };

export const LEAF = {
  width: DOOR.width * LEAF_FRAC.width,
  height: DOOR.height * LEAF_FRAC.height,
  thickness: 0.1,
  /** hinge line on the left edge */
  hingeX: DOOR.x - DOOR.width / 2 + DOOR.width * LEAF_FRAC.left,
  top: DOOR.height * (1 - LEAF_FRAC.top),
};
export const LEAF_CENTER_Y = LEAF.top - LEAF.height / 2;

/** how deep the doorway's reveal is: the light sits this far behind the face of the frame */
export const JAMB_DEPTH = 0.32;

/** where the front grass stands: where the ground first enters the frame */
export const GRASS = { z: -5.6, width: 7.6 };

/** the camera flies to just past the doorway; the cosmos takes over when it crosses */
export const FLIGHT_END_Z = DOOR.z - 2.5;
