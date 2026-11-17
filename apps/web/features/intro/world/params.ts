/**
 * Everything the intro timelines animate, as plain numbers. GSAP tweens them and the 3D stage
 * reads them every frame, so nothing here touches React.
 */
export type IntroParams = {
  /** 0 = the opening framing, 1 = a few steps from the door, facing it */
  focus: number;
  /** 0 = a few steps away, 1 = the doorway fills the screen (we are in Scene 2) */
  travel: number;
  /** 0 closed … 1 fully open (about 100 degrees on the hinge) */
  leaf: number;
  /** warm light showing at the gaps before the door opens */
  seam: number;
  /** how much of the doorway shows the world beyond (and light spilling onto the wood and grass) */
  glow: number;
  /** a blaze of warm light in the doorway as it opens; falls away as we pass through */
  flare: number;
  /** extra lens width for the rush through the doorway, degrees */
  warp: number;
  /** mouse parallax, -1 … 1, already eased */
  lookX: number;
  lookY: number;
  /** idle life: wind in the leaves and grass, drifting pollen, the camera breathing. 0 stops it */
  life: number;
  /** the painted door from the picture, over the 3D one: 1 in Scene 1, dissolving as the door moves */
  painted: number;
  /** 1 once the Vibers World has taken over the screen: the door stage stops drawing */
  rest: number;
};

/** the painted door stands ajar: the 3D leaf starts at the same angle (as a share of fully open) */
export const AJAR = 0.42;
/** radians: fully open, the leaf has swung away from us into the doorway, about 100 degrees */
export const LEAF_OPEN = 1.75;

export const initialIntroParams = (): IntroParams => ({
  focus: 0,
  travel: 0,
  leaf: AJAR,
  seam: 0.4,
  // as painted: warm light and the world beyond showing through the gap
  glow: 0,
  flare: 0.6,
  warp: 0,
  lookX: 0,
  lookY: 0,
  life: 1,
  painted: 1, rest: 0,
});

/**
 * Scene 1 is a painting set up as a flat backdrop at z = 0, one world unit per 100 of its pixels
 * (1672 × 941), centred on the origin. The 3D door stands in its painted doorway.
 */
export const PLATE = { width: 16.72, height: 9.41, px: 100 };

/** the painted doorway, in the painting's pixels: left 840, right 1124, top 182, threshold 800 */
const px = (x: number) => (x - 836) / PLATE.px;
const py = (y: number) => (470.5 - y) / PLATE.px;
export const DOOR = {
  x: px((840 + 1124) / 2),
  /** the threshold */
  y: py(800),
  width: (1124 - 840) / PLATE.px,
  height: (800 - 182) / PLATE.px,
  thickness: 0.2,
};
/** a piece cut out of the painting, by its box in painting pixels (left, top, right, bottom) */
const cutout = (l: number, t: number, r: number, b: number) => ({
  x: px((l + r) / 2),
  y: py((t + b) / 2),
  width: (r - l) / PLATE.px,
  height: (b - t) / PLATE.px,
});
/** the backpack and camera, and the skateboard: they stay in front of the door */
export const PACK = cutout(720, 610, 920, 880);
export const SKATEBOARD = cutout(1140, 535, 1300, 835);
/** the vines and flowers that hang over the hinge side of the door, kept in front of the leaf */
export const VINES = cutout(800, 140, 1010, 480);

export const FOV = 40;
const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
const PLATE_ASPECT = PLATE.width / PLATE.height;

export type Pose = { x: number; y: number; z: number };
export type Framing = {
  start: Pose;
  /** a few steps from the door, facing it */
  near: Pose;
  /** the doorway just overfills the screen */
  through: Pose;
  /** phones: how much of the screen's height the painting covers (the sky continues above it) */
  plateShare: number;
  aspect: number;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/**
 * The camera always looks straight at the painting, so the 3D door stays locked to it.
 * Wide screens see the whole painting (door right of centre, headline on the left, as drawn).
 * Narrower screens and phones crop the sides, keeping the door in view (phones centre it). On phones
 * lower part of the screen, centred on the door, with the sky continuing above it for the headline.
 */
export function framingFor(aspect: number): Framing {
  const phone = aspect < 0.8;
  // phones: the painting fills the screen's height, centred on the door, words over it
  const plateShare = 1;
  // the height of the view at the painting
  let viewH: number;
  if (phone) viewH = PLATE.height / plateShare;
  else if (aspect >= PLATE_ASPECT) viewH = PLATE.width / aspect;
  else viewH = PLATE.height;
  const viewW = viewH * aspect;
  const z = viewH / (2 * TAN);
  // across: centred on the painting when it all fits, otherwise as near the door as the edges allow
  const room = Math.max(0, (PLATE.width - viewW) / 2);
  const x = clamp(phone ? DOOR.x : DOOR.x * 0.6, -room, room);
  // up and down: phones line the painting's bottom up with the screen's bottom
  const y = phone ? -PLATE.height / 2 + viewH / 2 : 0;

  const midY = DOOR.y + DOOR.height / 2;
  // a few steps closer: the door about two thirds of the screen's height
  const nearH = Math.max(DOOR.height / 0.66, (DOOR.width / 0.5) / aspect);
  // through: the opening covers the screen with a little to spare
  const throughH = Math.min(DOOR.height, DOOR.width / aspect) * 0.82;
  return {
    start: { x, y, z },
    near: { x: DOOR.x, y: midY, z: Math.min(z, nearH / (2 * TAN)) },
    through: { x: DOOR.x, y: midY, z: throughH / (2 * TAN) + DOOR.thickness },
    plateShare,
    aspect,
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const c01 = (t: number) => clamp(t, 0, 1);

/** The camera at a point on its path: start → near (focus), near → through (travel). */
export function cameraAt(
  f: Framing,
  focus: number,
  travel: number,
  fov = FOV,
): Pose {
  const a = c01(focus),
    b = c01(travel);
  const p = {
    x: mix(f.start.x, f.near.x, a),
    y: mix(f.start.y, f.near.y, a),
    z: mix(f.start.z, f.near.z, a),
  };
  const pose = {
    x: mix(p.x, f.through.x, b),
    y: mix(p.y, f.through.y, b),
    z: mix(p.z, f.through.z, b),
  };
  // never look past the painting's edges (no empty band of page above, below or beside it)
  const viewH = 2 * pose.z * Math.tan(((fov / 2) * Math.PI) / 180);
  const viewW = viewH * f.aspect;
  const room = Math.max(0, (PLATE.width - viewW) / 2);
  pose.x = clamp(pose.x, -room, room);
  const low = -PLATE.height / 2 + viewH / 2;
  pose.y = clamp(pose.y, low, Math.max(low, PLATE.height / 2 - viewH / 2));
  return pose;
}
