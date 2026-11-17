import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { DOOR } from "./params";
import { dotSprite, plankTextures } from "./textures";

/**
 * The door as a real object, set into the painted doorway of Scene 1: a solid leaf with thickness,
 * ARPIT's painted panel on its front, battens on its back, iron knuckles on its hinge edge. It
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
  uniform vec2 uRes;
  uniform float uWorldAspect;
  uniform float uGlow;
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
    // closed: dark, with only the glow at the seam showing
    vec3 c = mix(vec3(0.05, 0.025, 0.01), world, uGlow);
    // the blaze adds to the world rather than hiding it, strongest low in the middle
    // a warm glow low in the opening, like lamplight; it adds to the world, never washes it out
    c += warm * uFlare * 0.18 * (1.0 - clamp(r, 0.0, 1.0));
    c += vec3(1.0, 0.62, 0.3) * uSeam * (1.0 - uGlow) * 0.35;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

export function makeWoodenDoor(faceTex: THREE.Texture): WoodenDoor {
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
  // the front is ARPIT's painted door panel; the back is built from planks
  const backWood = plankTextures(5, { seed: 11 });
  [backWood.map, backWood.bump].forEach(keep);
  // the panel is graded to the painting (dark, warm, shaded at the hinge, lit at the latch), so it
  // is drawn as it is when it faces us, and darkened by hand as it turns away from the light
  const face = keep(new THREE.MeshBasicMaterial({ map: faceTex }));
  const EDGE = new THREE.Color("#3a2010");
  const edge = keep(new THREE.MeshBasicMaterial({ color: EDGE.clone() }));
  const back = keep(
    new THREE.MeshStandardMaterial({
      map: backWood.map,
      bumpMap: backWood.bump,
      bumpScale: 1.5,
      roughness: 0.85,
      color: new THREE.Color(0.8, 0.72, 0.66),
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

  // iron hinge knuckles on the hinge edge (the panel already has its handle and hinge plates painted)
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

  return {
    group,
    hinge,
    uniforms,
    update: () => {
      const g = uniforms.glow.value;
      // turning away, the face falls into shade; its edge catches the warm light from the doorway
      const turn = Math.sin(Math.abs(hinge.rotation.y));
      face.color.setScalar(1 - 0.5 * turn);
      edge.color.copy(EDGE).lerp(new THREE.Color(0.62, 0.3, 0.1), 0.5 * turn * (0.3 + g));
      poolMat.opacity = Math.min(g * 1.4, 1) * 0.6;
      spill.intensity = 2 * uniforms.seam.value + g * 30;
    },
    dispose: () => trash.forEach((d) => d.dispose()),
  };
}
