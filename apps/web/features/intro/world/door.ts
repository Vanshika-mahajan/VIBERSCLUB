import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AJAR, DOOR, LEAF_OPEN } from "./params";
import { dotSprite, plankTextures } from "./textures";

/**
 * The door as a real object, set into the painted doorway of Scene 1: a solid leaf with thickness,
 * the painting's own door on its front (unfolded from Scene 1), battens on its back, iron knuckles on its hinge edge. It
 * replaces the painted leaf exactly, so in Scene 1 it looks like the picture, and then it swings
 * open on its hinge.
 *
 * Behind it is the doorway: a window onto the Vibers World (Scene 2), sampled in screen space so
 * that when the opening fills the screen we are standing in Scene 2. Warm light floods it as the door
 * opens and clears as we pass through.
 *
 * The group's origin is the centre of the doorway's threshold; the leaf opens away from us.
 */

export type WoodenDoor = {
  group: THREE.Group;
  /** rotate this around y: 0 closed, positive swings the leaf away from us, into the doorway */
  hinge: THREE.Group;
  uniforms: {
    time: THREE.IUniform<number>;
    glow: THREE.IUniform<number>;
    seam: THREE.IUniform<number>;
    flare: THREE.IUniform<number>;
    res: THREE.IUniform<THREE.Vector2>;
    worldAspect: THREE.IUniform<number>;
    world: THREE.IUniform<THREE.Texture | null>;
    /** Scene 1's painting: before the door opens, the doorway shows the painting's own glow */
    plate: THREE.IUniform<THREE.Texture | null>;
    /** 0 while the leaf stands ajar as painted, 1 once it has swung a little further */
    open: THREE.IUniform<number>;
  };
  /** per frame: glow drives the light spilling out */
  update: () => void;
  dispose: () => void;
};

const ROOM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// The doorway. Closed, only a warm line of light at the gaps. Opening, a blaze of warm light with the
// Vibers World inside it; the light clears (flare falls) as we pass through, leaving the world.
const ROOM_FRAG = /* glsl */ `
  uniform sampler2D uWorld;
  uniform sampler2D uPlate;
  uniform vec2 uRes;
  uniform float uWorldAspect;
  uniform float uGlow;
  uniform float uOpen;
  uniform float uSeam;
  uniform float uFlare;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // Scene 2 fitted to cover the screen, as the page behind would show it
    vec2 s = gl_FragCoord.xy / uRes;
    float a = uRes.x / uRes.y;
    vec2 uv = s;
    if (a > uWorldAspect) uv.y = (s.y - 0.5) * (uWorldAspect / a) + 0.5;
    else uv.x = (s.x - 0.5) * (a / uWorldAspect) + 0.5;
    vec3 world = texture2D(uWorld, uv).rgb;
    // light: hottest low in the middle of the opening, like a lit room beyond
    vec2 p = (vUv - vec2(0.5, 0.3)) * vec2(1.6, 1.0);
    float r = length(p);
    float flick = 0.97 + 0.03 * sin(uTime * 6.0 + vUv.y * 11.0);
    vec3 warm = mix(vec3(1.0, 0.86, 0.64) * 2.0, vec3(1.0, 0.55, 0.22) * 1.2, smoothstep(0.0, 0.9, r)) * flick;
    // closed: the painting's own doorway (the lit gap with the crowd in it, painting px 1044 to 1110),
    // mirrored across the part the leaf hides, so the hand-over from the painting is seamless
    // (while the leaf stands as painted, the painting itself shows round its edges; the 3D leaf is a
    // touch smaller in perspective than the painted one)
    float x0 = 840.0 + vUv.x * 284.0;
    float m = mod(max(1044.0 - x0, 0.0), 132.0);
    float xp = mix(x0, max(x0, 1044.0 + (m < 66.0 ? m : 132.0 - m)), uOpen);
    vec3 painted = texture2D(uPlate, vec2(xp / 1672.0, (vUv.y * 618.0 + 141.0) / 941.0)).rgb;
    vec3 c = mix(painted, world, uGlow);
    // the blaze adds to the world rather than hiding it, strongest low in the middle
    // a warm glow low in the opening, like lamplight; it adds to the world, never washes it out
    // it lights the world (multiplies) more than it fogs it (adds), so the picture keeps its contrast
    float fall = 1.0 - clamp(r, 0.0, 1.0);
    float lit = uFlare * max(uOpen, uGlow);
    c = c * (1.0 + warm * lit * 0.3 * fall) + warm * lit * 0.035 * fall;
    // the light at the gaps hugs the edges of the opening instead of washing over the world
    vec2 e = abs(vUv - 0.5) * 2.0;
    float rim = pow(max(e.x, e.y * 0.9), 6.0);
    c += vec3(1.0, 0.62, 0.3) * uSeam * max(uOpen, uGlow) * (0.06 * (1.0 - uGlow * 0.7) + 0.5 * rim * (1.0 - uGlow) * (1.0 - uGlow));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

/** The panel's maps: its colour, and the relief and sheen that let it catch the light as it turns. */
export type DoorFace = {
  map: THREE.Texture;
  normal: THREE.Texture;
  rough: THREE.Texture;
  /** a reflection of a softly lit room, for the brass */
  env: THREE.Texture | null;
};

// where the handle is painted on the door, in door-painted.webp's pixels (682 x 1463)
const PANEL = { w: 682, h: 1463 };
const HANDLE = { roseX: 620, roseY: 726, leverL: 559, plateT: 646, plateB: 872, plateL: 604, plateR: 640 };

// The light that blooms out over the frame and the vines from the gaps and then the open doorway,
// as a lens would see a bright light against a darker painting.
const HALO_FRAG = /* glsl */ `
  uniform float uAmount;
  uniform vec2 uHole;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    vec2 d = max(abs(p) - uHole, 0.0);
    float r = length(d / (1.0 - uHole));
    float inside = 1.0 - step(0.0001, length(d));
    float a = exp(-r * 4.5) * (1.0 - inside * 0.95) * smoothstep(1.0, 0.7, max(abs(p.x), abs(p.y)));
    gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * a * uAmount, 1.0);
  }
`;

export function makeWoodenDoor(art: DoorFace): WoodenDoor {
  const group = new THREE.Group();
  const trash: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    trash.push(x);
    return x;
  };
  const uniforms = {
    time: { value: 0 },
    glow: { value: 0 },
    seam: { value: 0.35 },
    flare: { value: 0 },
    res: { value: new THREE.Vector2(1, 1) },
    worldAspect: { value: 1671 / 941 },
    world: { value: null as THREE.Texture | null },
    plate: { value: null as THREE.Texture | null },
    open: { value: 0 },
  };
  const { width: W, height: H, thickness: T } = DOOR;

  // ---- the doorway, a hair behind the leaf
  const room = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(W, H)),
    keep(
      new THREE.ShaderMaterial({
        vertexShader: ROOM_VERT,
        fragmentShader: ROOM_FRAG,
        uniforms: {
          uWorld: uniforms.world,
          uPlate: uniforms.plate,
          uOpen: uniforms.open,
          uRes: uniforms.res,
          uWorldAspect: uniforms.worldAspect,
          uGlow: uniforms.glow,
          uSeam: uniforms.seam,
          uFlare: uniforms.flare,
          uTime: uniforms.time,
        },
        // drawn before the leaf and without depth, so the leaf can swing in and stay visible
        depthWrite: false,
      }),
    ),
  );
  room.position.set(0, H / 2, 0);
  room.renderOrder = 1;
  group.add(room);

  // ---- the leaf on its hinge
  // the front is the painting's own door; the back is built from planks
  const backWood = plankTextures(5, { seed: 11 });
  [backWood.map, backWood.bump].forEach(keep);
  // the front is cut from the painting itself. Most of it glows as painted (emissive), so facing us it
  // is the painting exactly; the rest is lit by the scene, so its grain and mouldings catch the light.
  // As it turns away the painted part dims by hand (see update). LIT and EMIT are the lit and glowing
  // shares (measured to add up to the painting); the tint balances the warm lights.
  const LIT = 0.3;
  const EMIT = 0.86;
  const TURN_AJAR = Math.sin(LEAF_OPEN * AJAR);
  const FACE_TINT = new THREE.Color(1.44, 2.39, 6.2);
  const face = keep(
    // painted wood has little sheen; a full one turns the leaf to a pale sliver when seen edge on
    new THREE.MeshPhysicalMaterial({
      specularIntensity: 0.2,
      map: art.map,
      normalMap: art.normal,
      normalScale: new THREE.Vector2(1.3, 1.3),
      roughnessMap: art.rough,
      roughness: 1,
      metalness: 0,
      color: FACE_TINT.clone().multiplyScalar(LIT),
      emissiveMap: art.map,
      emissive: new THREE.Color(1, 1, 1),
      emissiveIntensity: EMIT,
    }),
  );
  // the leaf's edges: end grain, lit warm by the doorway as the leaf turns
  const edgeWood = plankTextures(1, { seed: 5 });
  [edgeWood.map, edgeWood.bump].forEach(keep);
  // shaded by hand (see update): lit, the thin edge caught so much of the sun that it went pale
  const EDGE = new THREE.Color(0.5, 0.36, 0.28);
  const EDGE_LIT = new THREE.Color(1.0, 0.55, 0.25);
  const edge = keep(new THREE.MeshBasicMaterial({ map: edgeWood.map, color: EDGE.clone() }));
  const back = keep(
    new THREE.MeshLambertMaterial({
      map: backWood.map,
      bumpMap: backWood.bump,
      bumpScale: 1.5,
      color: new THREE.Color(0.15, 0.09, 0.06),
    }),
  );
  // a hair narrower than the opening: a line of light shows at the latch side
  const leafW = W * 0.985;
  const slab = new THREE.Mesh(
    keep(new RoundedBoxGeometry(leafW, H * 0.996, T, 3, T * 0.12)),
    [edge, edge, edge, edge, face, back],
  );
  slab.position.set(leafW / 2, 0, -T / 2);
  slab.renderOrder = 2;
  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, H / 2, T + 0.01);
  hinge.add(slab);

  // battens and a diagonal brace on the back, so the back reads as the built side
  const batten = keep(
    new RoundedBoxGeometry(leafW * 0.9, H * 0.055, T * 0.4, 2, T * 0.06),
  );
  for (const y of [-H * 0.38, H * 0.38]) {
    const b = new THREE.Mesh(batten, back);
    b.position.set(leafW / 2, y, -T - T * 0.2);
    hinge.add(b);
  }
  const brace = new THREE.Mesh(
    keep(new RoundedBoxGeometry(H * 0.05, H * 0.8, T * 0.4, 2, T * 0.06)),
    back,
  );
  brace.position.set(leafW / 2, 0, -T - T * 0.2);
  brace.rotation.z = Math.atan2(leafW * 0.78, H * 0.76);
  hinge.add(brace);

  // the brass lever handle, over the painted one, standing off the wood
  const brass = keep(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color("#b8873a"),
      metalness: 1,
      roughness: 0.32,
      envMap: art.env,
      envMapIntensity: 0.9,
    }),
  );
  const pxw = leafW / PANEL.w,
    pxh = (H * 0.996) / PANEL.h;
  const at = (x: number, y: number) => [x * pxw, H * 0.498 - y * pxh] as const;
  const [rx, ry] = at(HANDLE.roseX, HANDLE.roseY);
  const plateH = (HANDLE.plateB - HANDLE.plateT) * pxh,
    plateW = (HANDLE.plateR - HANDLE.plateL) * pxw;
  const backplate = new THREE.Mesh(
    keep(new RoundedBoxGeometry(plateW, plateH, 0.025, 4, plateW * 0.45)),
    brass,
  );
  const [, plateY] = at(0, (HANDLE.plateT + HANDLE.plateB) / 2);
  backplate.position.set(at((HANDLE.plateL + HANDLE.plateR) / 2, 0)[0], plateY, 0.012);
  const rose = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.055, 0.06, 24)), brass);
  rose.rotation.x = Math.PI / 2;
  rose.position.set(rx, ry, 0.05);
  const leverLen = (HANDLE.roseX - HANDLE.leverL) * pxw;
  const leverGeo = keep(new THREE.CapsuleGeometry(0.021, leverLen, 6, 16));
  const lever = new THREE.Mesh(leverGeo, brass);
  lever.rotation.z = Math.PI / 2;
  lever.position.set(rx - leverLen / 2, ry, 0.075);
  const neck = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 16)), brass);
  neck.rotation.x = Math.PI / 2;
  neck.position.set(rx, ry, 0.07);
  for (const m of [backplate, rose, lever, neck]) {
    m.renderOrder = 3;
    hinge.add(m);
  }

  // iron hinge knuckles on the hinge edge
  const iron = keep(
    new THREE.MeshStandardMaterial({
      color: "#2b2723",
      roughness: 0.4,
      metalness: 0.85,
    }),
  );
  const knuckleGeo = keep(new THREE.CylinderGeometry(0.05, 0.05, H * 0.05, 14));
  for (const y of [H * 0.4, 0, -H * 0.4]) {
    const knuckle = new THREE.Mesh(knuckleGeo, iron);
    knuckle.position.set(-0.02, y, -T / 2);
    hinge.add(knuckle);
  }
  group.add(hinge);

  // ---- the light that pours out: a pool on the grass and a warm point light on the wood
  const poolMat = keep(
    new THREE.MeshBasicMaterial({
      map: keep(dotSprite()),
      color: new THREE.Color(1, 0.6, 0.28),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    }),
  );
  const pool = new THREE.Mesh(keep(new THREE.PlaneGeometry(W * 2.2, 1.6)), poolMat);
  pool.position.set(0, 0.25, 0.4);
  pool.renderOrder = 4;
  group.add(pool);
  const spill = new THREE.PointLight(0xffa452, 0, 14, 1.4);
  spill.position.set(0.4, H * 0.45, 1.8);
  group.add(spill);
  // and a light inside the doorway, so the face and edge of the opening leaf glow warm from behind
  const inside = new THREE.PointLight(0xffb066, 0, 8, 1.6);
  inside.position.set(W * 0.4, H * 0.35, -3);
  group.add(inside);

  // the bloom of the light over the frame
  const holeX = 1 / 1.7,
    holeY = 1 / 1.25;
  const haloUniforms = { uAmount: { value: 0 }, uHole: { value: new THREE.Vector2(holeX, holeY) } };
  const halo = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(W * 1.7, H * 1.25)),
    keep(
      new THREE.ShaderMaterial({
        vertexShader: ROOM_VERT,
        fragmentShader: HALO_FRAG,
        uniforms: haloUniforms,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  halo.position.set(0, H / 2, T + 0.08);
  halo.renderOrder = 4.6;
  group.add(halo);

  return {
    group,
    hinge,
    uniforms,
    update: () => {
      const g = uniforms.glow.value;
      // turning away, the face falls into shade on its own; its edge catches the warm doorway light
      const turn = Math.sin(Math.abs(hinge.rotation.y));
      const f = uniforms.flare.value;
      edge.color.copy(EDGE).multiplyScalar(0.7 + 0.3 * (1 - turn)).lerp(EDGE_LIT, 0.35 * turn * g * (0.4 + 0.6 * f));
      // the painting already shows the leaf ajar, so the dimming counts from there
      const away = Math.max(0, (turn - TURN_AJAR) / (1 - TURN_AJAR));
      face.emissiveIntensity = EMIT * (1 - 0.6 * away);
      face.color.copy(FACE_TINT).multiplyScalar(LIT * (1 - 0.6 * away));
      face.emissive.setRGB(1, 1, 1).lerp(new THREE.Color(1.3, 0.85, 0.55), turn * g * f * 0.6);
      poolMat.opacity = Math.min(g * 1.4, 1) * 0.6;
      spill.intensity = 2 * uniforms.seam.value + g * 9;
      inside.intensity = g * 3 * (0.5 + 0.5 * f);
      haloUniforms.uAmount.value = 0.12 * uniforms.seam.value * (1 - g) + 0.55 * f * g;
    },
    dispose: () => trash.forEach((d) => d.dispose()),
  };
}
