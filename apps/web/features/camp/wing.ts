import * as THREE from "three";

/**
 * A paraglider wing for ARPIT's flight (ARPIT chose "Real wing, breathing and swaying", 2026-11-20).
 *
 * Seen from the front it keeps the size of ARPIT's flat canopy (about 6 wide, its crown about 2.4 up),
 * but it is a real wing: an arc from tip to tip, an aerofoil from the leading edge back, the chord
 * shorter toward the tips, an upper and a lower skin, open cells along the nose, ribs and panel seams.
 * It breathes: the fabric ripples, the tips flex, the arc swells a little. Coordinates are the
 * canopy's own: x across, y up, z toward the camera (the leading edge faces us, at z 0).
 */
const SPAN = 64; // segments tip to tip
const CHORD = 14; // segments nose to tail
const ARC = 0.82; // radians either side of the crown
const RADIUS = 3.0 / Math.sin(ARC); // so the tips land 3 to either side, like ARPIT's 6-wide canopy
const CROWN = 2.35; // height of the crown above the canopy's origin
const CHORD_ROOT = 1.55;
const CHORD_TIP = 0.75;
const CELLS = 28;

/** the stripes, ribs and seams, drawn once */
function skinTexture(colors: number[], under: boolean) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 64;
  const g = c.getContext("2d")!;
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    const col = new THREE.Color(colors[i]);
    if (under) col.multiplyScalar(0.82);
    g.fillStyle = `#${col.getHexString()}`;
    g.fillRect(
      Math.floor((i * c.width) / n),
      0,
      Math.ceil(c.width / n) + 1,
      c.height,
    );
  }
  // ribs: a faint line at every cell
  g.fillStyle = under ? "rgba(60,20,5,0.16)" : "rgba(80,30,10,0.12)";
  for (let k = 1; k < CELLS; k++)
    g.fillRect(Math.round((k * c.width) / CELLS) - 1, 0, 2, c.height);
  // seams between the colour panels
  g.fillStyle = "rgba(40,12,4,0.35)";
  for (let i = 1; i < n; i++)
    g.fillRect(Math.round((i * c.width) / n) - 1, 0, 3, c.height);
  // a stitched band along the nose and the trailing edge
  g.fillStyle = "rgba(255,240,220,0.22)";
  g.fillRect(0, 2, c.width, 2);
  g.fillStyle = "rgba(40,12,4,0.25)";
  g.fillRect(0, c.height - 4, c.width, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** the open cells along the nose: dark mouths between light ribs */
function noseTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = "#3a160c";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#c2581f";
  for (let k = 0; k <= CELLS; k++)
    g.fillRect(Math.round((k * c.width) / CELLS) - 3, 0, 6, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeWing(colors: number[]) {
  const group = new THREE.Group();
  const trash: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T) => (trash.push(d), d);

  const sheet = () => keep(new THREE.PlaneGeometry(1, 1, SPAN, CHORD));
  const upperGeo = sheet();
  const lowerGeo = sheet();
  const noseGeo = keep(new THREE.PlaneGeometry(1, 1, SPAN, 1));
  const upper = new THREE.Mesh(
    upperGeo,
    keep(
      new THREE.MeshLambertMaterial({
        map: keep(skinTexture(colors, false)),
        side: THREE.DoubleSide,
      }),
    ),
  );
  const lower = new THREE.Mesh(
    lowerGeo,
    keep(
      new THREE.MeshLambertMaterial({
        map: keep(skinTexture(colors, true)),
        side: THREE.DoubleSide,
      }),
    ),
  );
  const nose = new THREE.Mesh(
    noseGeo,
    keep(
      new THREE.MeshBasicMaterial({
        map: keep(noseTexture()),
        side: THREE.DoubleSide,
      }),
    ),
  );
  group.add(upper, lower, nose);

  // the aerofoil: thickness above and below the camber line, by place along the chord (0 nose … 1 tail)
  const thick = (c: number) =>
    0.13 * (2.9 * Math.sqrt(c) - 2.6 * c - 1.2 * c * c + 0.9 * c * c * c);
  const camber = (c: number) => 0.06 * Math.sin(Math.PI * Math.min(1, c * 1.1));

  const p = new THREE.Vector3();
  /** a point on the wing: span s (-1 … 1), chord c (0 … 1), side +1 upper / -1 lower / 0 camber */
  const point = (
    s: number,
    c: number,
    side: number,
    t: number,
    flex: number,
    out: THREE.Vector3,
  ) => {
    const a = Math.abs(s);
    // the arc swells a little as the wing breathes, and the tips flex up and down
    const arc = ARC * (1 + 0.025 * flex * Math.sin(t * 1.3));
    const th = s * arc;
    const chord = CHORD_ROOT + (CHORD_TIP - CHORD_ROOT) * Math.pow(a, 1.6);
    // the tips sweep back a touch
    const z0 = -0.25 * a * a;
    const along = c * chord;
    const r = RADIUS + (camber(c) + side * thick(c)) * chord;
    out.set(Math.sin(th) * r, Math.cos(th) * r - RADIUS + CROWN, z0 - along);
    out.y += flex * a * a * 0.07 * Math.sin(t * 1.9 - s * 1.5);
    // the fabric ripples, most toward the trailing edge, a little on the upper skin
    out.y +=
      flex *
      (0.012 + 0.02 * c) *
      Math.sin(t * 5.1 + s * 11.0 - c * 7.0) *
      (side >= 0 ? 1 : 0.6);
    return out;
  };

  const shape = (
    geo: THREE.PlaneGeometry,
    side: number,
    t: number,
    flex: number,
  ) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j <= CHORD; j++)
      for (let i = 0; i <= SPAN; i++) {
        const s = (i / SPAN) * 2 - 1;
        // more rows toward the nose, where the aerofoil curves most
        const c = Math.pow(j / CHORD, 1.6);
        point(s, c, side, t, flex, p);
        pos.setXYZ(j * (SPAN + 1) + i, p.x, p.y, p.z);
      }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  const shapeNose = (t: number, flex: number) => {
    const pos = noseGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= SPAN; i++) {
      const s = (i / SPAN) * 2 - 1;
      // the cell mouths sit just behind the nose, between the two skins
      point(s, 0.035, 1, t, flex, p);
      pos.setXYZ(i, p.x, p.y, p.z);
      point(s, 0.035, -1, t, flex, p);
      pos.setXYZ(SPAN + 1 + i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
  };

  /** where the lines meet the lower skin: a row of points across the span, a third back from the nose */
  const ATTACH = [-0.95, -0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72, 0.95];
  const anchors = ATTACH.map(() => new THREE.Vector3());

  const update = (t: number, flex = 1) => {
    shape(upperGeo, 1, t, flex);
    shape(lowerGeo, -1, t, flex);
    shapeNose(t, flex);
    ATTACH.forEach((s, k) => point(s, 0.32, -1, t, flex, anchors[k]));
  };
  update(0);

  return {
    group,
    update,
    anchors,
    dispose: () => trash.forEach((d) => d.dispose()),
  };
}
