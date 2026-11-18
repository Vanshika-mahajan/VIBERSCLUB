import * as THREE from "three";

/**
 * Makes ARPIT's door belong in the meadow (ARPIT, 2026-11-18: "it looks like it doesnt belong there").
 * - Depth: the door sits back inside a jamb, so the inner sides of the frame show, lit by the low sun on
 *   the left; the frame throws a soft shadow onto the door's left edge and head while it is shut.
 * - Light: the wood is graded to the picture's warm evening light, with a warm rim on the sunny side,
 *   a little haze, and darker toward the grass (where less sky reaches).
 * - Ground: a dark contact line where it stands, a long soft shadow toward us and to the right (the sun
 *   is low behind it on the left), and the picture's own grass showing in front of its foot.
 */
export const RECESS = 0.3; // how far the door and the doorway sit back inside the frame

type Opts = {
  doorGroup: THREE.Group;
  frameMat: THREE.MeshBasicMaterial;
  leafMat: THREE.MeshBasicMaterial;
  openW: number;
  doorH: number;
  /** the casing around the opening: width of the sides and the head, and how far it reaches below the foot */
  casing: { side: number; head: number; below: number };
  keep: <T extends { dispose(): void }>(d: T) => T;
};

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** warm evening grade, a sun rim on the left, haze, and darker toward the ground */
const GRADE = /* glsl */ `
  // blades of the picture's own grass stand in front of the foot: the wood is cut away in their shape
  float bx = floor(vMapUv.x * uBlades);
  float bh = 0.05 + 0.17 * pow(fract(sin(bx * 12.9898) * 43758.5453), 2.0) + 0.04 * fract(sin(bx * 78.233) * 9821.13);
  float above = (vMapUv.y - uFoot) * uTall; // height above the ground, in scene units
  if (above < bh * (1.0 - abs(fract(vMapUv.x * uBlades) - 0.5) * 1.6)) discard;
  float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.9);
  diffuseColor.rgb *= vec3(1.0, 0.9, 0.78) * 0.86;
  diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0, 0.16, vMapUv.y));
  diffuseColor.rgb += vec3(0.12, 0.07, 0.02) * (1.0 - smoothstep(0.0, uRim, vMapUv.x));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.72, 0.56), 0.04);
`;

function grade(mat: THREE.MeshBasicMaterial, rim: number, size: { foot: number; tall: number; wide: number }, extra = "", uniforms: Record<string, { value: unknown }> = {}) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(
      shader.uniforms,
      { uRim: { value: rim }, uFoot: { value: size.foot }, uTall: { value: size.tall }, uBlades: { value: size.wide * 60 } },
      uniforms,
    );
    const decl = ["uniform float uRim, uFoot, uTall, uBlades;", ...Object.keys(uniforms).map((k) => `uniform float ${k};`)].join("\n");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${decl}`)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${GRADE}\n${extra}`);
  };
  mat.customProgramCacheKey = () => `door-grade-${rim}-${extra.length}`;
  mat.needsUpdate = true;
}

export function groundDoor(o: Opts) {
  const { doorGroup, openW, doorH, keep } = o;
  const uShut = { value: 1 };
  const c = o.casing;
  const tallFrame = doorH + c.head + c.below;
  grade(o.frameMat, 0.1, { foot: c.below / tallFrame, tall: tallFrame, wide: openW + 2 * c.side });
  // the frame shades the shut door's left edge and its head
  grade(
    o.leafMat,
    0.0001,
    { foot: 0, tall: doorH, wide: openW },
    /* glsl */ `
    float sh = mix(0.62, 1.0, smoothstep(0.0, 0.16, vMapUv.x)) * mix(0.8, 1.0, smoothstep(0.0, 0.05, 1.0 - vMapUv.y));
    diffuseColor.rgb *= mix(1.0, sh, uShut);`,
    { uShut },
  );

  // ---- the jamb: the frame's inner sides, from its face back to the door
  const jambTex = keep(
    canvasTex(64, 256, (g) => {
      // walnut, darker toward the back where the door sits
      const grd = g.createLinearGradient(0, 0, 64, 0);
      grd.addColorStop(0, "#7a4526");
      grd.addColorStop(1, "#2e170c");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 256);
      g.globalAlpha = 0.18;
      for (let y = 0; y < 256; y += 3) {
        g.fillStyle = y % 2 ? "#000" : "#a8683c";
        g.fillRect(0, y, 64, 1);
      }
    }),
  );
  const jamb = (lit: number) =>
    keep(new THREE.MeshBasicMaterial({ map: jambTex, color: new THREE.Color(lit, lit * 0.9, lit * 0.78), toneMapped: false, side: THREE.DoubleSide }));
  const side = keep(new THREE.PlaneGeometry(RECESS, doorH));
  // left side: faces right, away from the sun (in shade); right side: faces left, into the sun
  const left = new THREE.Mesh(side, jamb(0.55));
  left.rotation.y = Math.PI / 2;
  left.position.set(-openW / 2 + 0.002, doorH / 2, -RECESS / 2);
  const right = new THREE.Mesh(side, jamb(1.15));
  right.rotation.y = -Math.PI / 2;
  right.position.set(openW / 2 - 0.002, doorH / 2, -RECESS / 2);
  const head = new THREE.Mesh(keep(new THREE.PlaneGeometry(openW, RECESS)), jamb(0.45));
  head.rotation.x = Math.PI / 2;
  head.position.set(0, doorH - 0.002, -RECESS / 2);
  for (const m of [left, right, head]) {
    m.renderOrder = 4;
    doorGroup.add(m);
  }

  // ---- shadows on the ground
  const reach = { x0: -2.2, x1: 4.2, z0: -0.8, z1: 3.6 }; // the patch of ground they cover
  const W = 512,
    H = 360;
  const toPx = (x: number, z: number) => [((x - reach.x0) / (reach.x1 - reach.x0)) * W, ((z - reach.z0) / (reach.z1 - reach.z0)) * H] as const;
  const halfFoot = openW / 2 + o.casing.side;
  const shadowTex = keep(
    canvasTex(W, H, (g) => {
      // the long shadow: the door's outline laid on the ground toward us and to the right, fading out
      const [ax, az] = toPx(-halfFoot, 0.05);
      const [bx, bz] = toPx(halfFoot, 0.05);
      const lean = { x: 0.55, z: 0.78 }; // per unit of height
      const top = doorH + o.casing.head;
      const [cx, cz] = toPx(halfFoot + lean.x * top, 0.05 + lean.z * top);
      const [dx, dz] = toPx(-halfFoot + lean.x * top, 0.05 + lean.z * top);
      const grd = g.createLinearGradient(ax, az, (cx + dx) / 2, (cz + dz) / 2);
      grd.addColorStop(0, "rgba(22,26,8,0.75)");
      grd.addColorStop(0.6, "rgba(22,26,8,0.32)");
      grd.addColorStop(1, "rgba(22,26,8,0)");
      g.filter = "blur(6px)";
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(ax, az);
      g.lineTo(bx, bz);
      g.lineTo(cx, cz);
      g.lineTo(dx, dz);
      g.closePath();
      g.fill();
      // where it touches the ground: a dark, soft line under the frame's foot
      g.filter = "blur(4px)";
      g.fillStyle = "rgba(18,16,6,0.7)";
      const [fx0, fz0] = toPx(-halfFoot - 0.04, -0.06);
      const [fx1, fz1] = toPx(halfFoot + 0.04, 0.12);
      g.fillRect(fx0, fz0, fx1 - fx0, fz1 - fz0);
    }),
  );
  const ground = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(reach.x1 - reach.x0, reach.z1 - reach.z0)),
    keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((reach.x0 + reach.x1) / 2, 0.003, (reach.z0 + reach.z1) / 2);
  ground.renderOrder = 3;
  doorGroup.add(ground);

  return {
    /** 0 shut .. 1 open: the frame's shade on the door fades as it swings out into the light */
    update(door: number) {
      uShut.value = 1 - Math.min(1, door * 3);
    },
  };
}
