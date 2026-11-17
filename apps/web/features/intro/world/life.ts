import * as THREE from "three";
import { PLATE } from "./params";

/**
 * Real things moving in Scene 1, in front of the painting:
 * - the branch overhead, cut out of the painting (tools/branch.py), swaying on its joint with the
 *   trunk while its leaves flutter;
 * - mist banks drifting between the mountain ridges and over the forest, each at its own depth;
 * - leaves letting go of the branch and tumbling down through the air;
 * - grass blades and white daisies along the bottom of the screen, bending in the gusts.
 *
 * Things drawn on the painting (the branch, the mist) take the same depth as the painting at their
 * place (see PLATE_VERT in stage.ts), so they stay locked to it as the camera drifts. The rest are
 * real 3D objects in the air between us and the door.
 */

/** painting pixels to the stage's world units, at the painting's plane */
const wx = (x: number) => (x - 836) / PLATE.px;
const wy = (y: number) => (470.5 - y) / PLATE.px;

// the branch's box in the painting (as cut by tools/branch.py) and where it joins the trunk
const BRANCH = { l: 190, t: 0, r: 840, b: 345 };
const JOINT = { x: 215, y: 125 };

// the same projection as the painting's: from the opening camera, a point at the painting's plane
// is moved along its line of sight to the given depth, so it looks the same from there
const AT_DEPTH = /* glsl */ `
  uniform vec3 uEye;
  uniform float uDepthOn;
  vec3 atDepth(vec3 w, float z) {
    return uEye + (w - uEye) * ((uEye.z - z * uDepthOn) / uEye.z);
  }
`;
const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
`;

// ---------------------------------------------------------------- the branch
const BRANCH_VERT = /* glsl */ `
  ${AT_DEPTH}
  uniform float uAngle;
  uniform vec2 uJoint;
  uniform float uZ;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    // the whole branch swings a little on its joint with the trunk, the tip most
    vec2 d = w.xy - uJoint;
    float c = cos(uAngle), s = sin(uAngle);
    w.xy = uJoint + vec2(c * d.x - s * d.y, s * d.x + c * d.y);
    w.xyz = atDepth(w.xyz, uZ);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const BRANCH_FRAG = /* glsl */ `
  ${NOISE}
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uWind;
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    // the leaves flutter on their stems, more toward the tip
    float tip = smoothstep(0.1, 0.9, vUv.x);
    vec2 f = vec2(noise(vUv * vec2(30.0, 16.0) + vec2(uTime * 1.8, 0.0)), noise(vUv * vec2(30.0, 16.0) + vec2(0.0, uTime * 1.5) + 7.0)) - 0.5;
    vec4 c = texture2D(uMap, vUv + f * 0.006 * tip * uWind);
    gl_FragColor = vec4(c.rgb, c.a * uFade);
    #include <colorspace_fragment>
  }
`;

// ---------------------------------------------------------------- mist banks
const MIST_VERT = /* glsl */ `
  ${AT_DEPTH}
  uniform float uZ;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    w.xyz = atDepth(w.xyz, uZ);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const MIST_FRAG = /* glsl */ `
  ${NOISE}
  uniform float uTime;
  uniform float uAmount;
  uniform float uSpeed;
  uniform float uSeed;
  uniform vec3 uColour;
  varying vec2 vUv;
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 p = vUv * vec2(3.0, 1.2) + vec2(uTime * uSpeed + uSeed, uSeed * 0.3);
    float n = fbm(p + vec2(fbm(p * 0.7 + uTime * 0.02), 0.0));
    // a soft bank, thickest along its middle, fading out at every edge
    float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.45, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
    float a = smoothstep(0.35, 0.8, n) * edge * uAmount;
    gl_FragColor = vec4(uColour, a);
    #include <colorspace_fragment>
  }
`;

// ---------------------------------------------------------------- falling leaves
const LEAF_VERT = /* glsl */ `
  attribute vec4 aLeaf; // start x, start z, seed, size
  uniform float uTime;
  uniform float uWind;
  varying vec2 vUv;
  varying float vLight;
  varying float vSeed;
  mat3 rot(vec3 a, float r) {
    a = normalize(a);
    float s = sin(r), c = cos(r), o = 1.0 - c;
    return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s,
                o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s,
                o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c);
  }
  void main() {
    vUv = uv;
    vSeed = aLeaf.z;
    // each leaf falls from the branch over 9 to 15 seconds, drifting with the wind, then starts again
    float period = 9.0 + 6.0 * fract(aLeaf.z * 7.3);
    float k = fract(uTime / period + aLeaf.z);
    float fall = k * 9.5;
    vec3 c = vec3(aLeaf.x + k * 5.5 * uWind + sin(k * 9.0 + aLeaf.z * 20.0) * 0.6, 4.8 - fall, aLeaf.y);
    // tumbling: it turns over and flutters as it falls
    vec3 axis = vec3(sin(aLeaf.z * 13.0), 1.0, cos(aLeaf.z * 7.0));
    mat3 r = rot(axis, uTime * (1.2 + aLeaf.z) + aLeaf.z * 30.0) * rot(vec3(1.0, 0.0, 0.0), sin(uTime * 3.0 + aLeaf.z * 9.0) * 0.6);
    vec3 n = r * vec3(0.0, 0.0, 1.0);
    vLight = 0.55 + 0.45 * abs(n.z);
    vec3 p = c + r * (position * aLeaf.w);
    // fades in leaving the branch and out near the ground
    vLight *= smoothstep(0.0, 0.06, k) * smoothstep(1.0, 0.85, k);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;
const LEAF_FRAG = /* glsl */ `
  uniform float uFade;
  varying vec2 vUv;
  varying float vLight;
  varying float vSeed;
  void main() {
    // a leaf: pointed at both ends, a midrib down the middle
    vec2 p = vUv * 2.0 - 1.0;
    float w = 0.62 * (1.0 - p.y * p.y) * (1.0 - 0.25 * p.y);
    float inside = smoothstep(w, w - 0.08, abs(p.x));
    if (inside < 0.02) discard;
    vec3 green = mix(vec3(0.24, 0.29, 0.1), vec3(0.55, 0.5, 0.18), vSeed);
    float rib = smoothstep(0.05, 0.0, abs(p.x)) * 0.25;
    vec3 c = green * (vLight + rib) * vec3(1.15, 1.0, 0.85);
    c = pow(c, vec3(2.2)); // picked as painting colours (sRGB); the output step converts back
    gl_FragColor = vec4(c, inside * uFade * step(0.001, vLight) * min(1.0, vLight * 3.0));
    #include <colorspace_fragment>
  }
`;

// ---------------------------------------------------------------- grass and daisies in front
const BLADE_VERT = /* glsl */ `
  attribute vec3 aBase;
  attribute vec4 aBlade; // height, width, lean, seed
  uniform float uTime;
  uniform float uWind;
  varying float vY;
  varying float vSeed;
  void main() {
    float y = position.y;
    float h = aBlade.x;
    vec3 p = vec3(position.x * aBlade.y * (1.0 - y * 0.9), y * h, 0.0);
    // a gust rolls through from the left; each blade also has its own lean and flutter
    float gust = sin(uTime * 1.25 - aBase.x * 0.45) * 0.55 + sin(uTime * 2.6 + aBase.x * 1.7 + aBlade.w * 6.0) * 0.18;
    float bend = (aBlade.z + (0.25 + gust) * uWind * 0.55) * y * y * h;
    p.x += bend;
    p.y -= abs(bend) * 0.3 * y;
    vY = y;
    vSeed = aBlade.w;
    gl_Position = projectionMatrix * viewMatrix * vec4(aBase + p, 1.0);
  }
`;
const BLADE_FRAG = /* glsl */ `
  uniform float uFade;
  varying float vY;
  varying float vSeed;
  void main() {
    // dark at the root, golden where the low sun catches the tips from behind
    vec3 root = vec3(0.1, 0.12, 0.04);
    vec3 tip = mix(vec3(0.38, 0.42, 0.14), vec3(0.72, 0.56, 0.24), vSeed * vSeed);
    vec3 c = mix(root, tip, smoothstep(0.0, 1.0, vY));
    c = pow(c, vec3(2.2)); // picked as painting colours (sRGB); the output step converts back
    gl_FragColor = vec4(c, uFade * smoothstep(0.0, 0.15, vY + 0.05) * (1.0 - 0.35 * vY * vY));
    #include <colorspace_fragment>
  }
`;
const DAISY_VERT = /* glsl */ `
  attribute vec3 aBase;
  attribute vec3 aDaisy; // stem height, head size, seed
  uniform float uTime;
  uniform float uWind;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float h = aDaisy.x;
    float gust = sin(uTime * 1.25 - aBase.x * 0.45) * 0.55 + sin(uTime * 2.1 + aDaisy.z * 9.0) * 0.2;
    float bend = (0.25 + gust) * uWind * 0.5 * h;
    // the head sits on top of its stem (the stem is a grass blade at the same place), facing us
    vec3 head = aBase + vec3(bend, h - abs(bend) * 0.3, 0.0);
    vec4 mv = viewMatrix * vec4(head, 1.0);
    mv.xy += position.xy * aDaisy.y;
    gl_Position = projectionMatrix * mv;
  }
`;
const DAISY_FRAG = /* glsl */ `
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    // eleven white petals round a golden heart
    float petal = 0.72 + 0.28 * cos(a * 11.0);
    float flower = smoothstep(petal, petal - 0.12, r);
    if (flower < 0.02) discard;
    float heart = smoothstep(0.3, 0.22, r);
    vec3 c = mix(vec3(0.98, 0.95, 0.88) * (0.85 + 0.15 * (1.0 - r)), vec3(0.93, 0.68, 0.18), heart);
    gl_FragColor = vec4(c, flower * uFade * 0.95);
    #include <colorspace_fragment>
  }
`;

export type SceneLife = {
  group: THREE.Group;
  /** per frame: time, wind (0 still … 1), and how much of it shows (fades as we walk through) */
  update: (time: number, wind: number, show: number) => void;
  dispose: () => void;
};

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function makeSceneLife(
  branchTex: THREE.Texture,
  shared: { uEye: THREE.IUniform<THREE.Vector3>; uDepthOn: THREE.IUniform<number> },
): SceneLife {
  const group = new THREE.Group();
  const trash: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    trash.push(x);
    return x;
  };
  const time = { value: 0 };
  const wind = { value: 1 };
  const fade = { value: 1 };
  const rand = seeded(91);

  // ---- the branch
  const angle = { value: 0 };
  const branch = new THREE.Mesh(
    keep(new THREE.PlaneGeometry((BRANCH.r - BRANCH.l) / PLATE.px, (BRANCH.b - BRANCH.t) / PLATE.px, 24, 12)),
    keep(
      new THREE.ShaderMaterial({
        vertexShader: BRANCH_VERT,
        fragmentShader: BRANCH_FRAG,
        uniforms: {
          ...shared,
          uMap: { value: branchTex },
          uAngle: angle,
          uJoint: { value: new THREE.Vector2(wx(JOINT.x), wy(JOINT.y)) },
          uZ: { value: 2.6 },
          uTime: time,
          uWind: wind,
          uFade: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
      }),
    ),
  );
  branch.position.set(wx((BRANCH.l + BRANCH.r) / 2), wy((BRANCH.t + BRANCH.b) / 2), 0);
  branch.renderOrder = 5;
  branch.frustumCulled = false;
  group.add(branch);

  // ---- mist banks: (centre x, centre y, width, height in painting pixels), depth, strength, speed
  const banks: [number, number, number, number, number, number, number][] = [
    [430, 318, 760, 150, -75, 0.55, 0.012],
    [330, 520, 820, 210, -30, 0.45, -0.008],
    [1460, 372, 640, 120, -60, 0.4, 0.01],
    [1480, 560, 520, 130, -16, 0.28, -0.012],
    [1500, 245, 340, 80, -95, 0.3, 0.014],
  ];
  const mistColour = new THREE.Color("#f6e3cf");
  for (const [cx, cy, w, h, z, amount, speed] of banks) {
    const mist = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(w / PLATE.px, h / PLATE.px)),
      keep(
        new THREE.ShaderMaterial({
          vertexShader: MIST_VERT,
          fragmentShader: MIST_FRAG,
          uniforms: {
            ...shared,
            uZ: { value: z },
            uTime: time,
            uAmount: { value: amount },
            uSpeed: { value: speed },
            uSeed: { value: rand() * 50 },
            uColour: { value: mistColour },
          },
          transparent: true,
          depthWrite: false,
          depthTest: false,
        }),
      ),
    );
    mist.position.set(wx(cx), wy(cy), 0);
    mist.renderOrder = 0.5;
    mist.frustumCulled = false;
    mist.userData.amount = amount;
    group.add(mist);
  }

  // ---- leaves falling from the branch
  const LEAVES = 14;
  const leafGeo = keep(new THREE.InstancedBufferGeometry());
  const quad = new THREE.PlaneGeometry(1, 1.6);
  leafGeo.index = quad.index;
  leafGeo.setAttribute("position", quad.getAttribute("position"));
  leafGeo.setAttribute("uv", quad.getAttribute("uv"));
  const leafInfo = new Float32Array(LEAVES * 4);
  for (let i = 0; i < LEAVES; i++) {
    leafInfo.set([wx(260 + rand() * 600) - 1.5, 1 + rand() * 4.5, i / LEAVES + rand() * 0.05, 0.1 + rand() * 0.07], i * 4);
  }
  leafGeo.setAttribute("aLeaf", new THREE.InstancedBufferAttribute(leafInfo, 4));
  leafGeo.instanceCount = LEAVES;
  const leaves = new THREE.Mesh(
    leafGeo,
    keep(
      new THREE.ShaderMaterial({
        vertexShader: LEAF_VERT,
        fragmentShader: LEAF_FRAG,
        uniforms: { uTime: time, uWind: wind, uFade: fade },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),
  );
  leaves.frustumCulled = false;
  leaves.renderOrder = 7;
  group.add(leaves);

  // ---- grass blades and daisies along the bottom, between us and the door
  const BLADES = 900;
  const blade = new THREE.BufferGeometry();
  const bp: number[] = [];
  for (let i = 0; i <= 4; i++) bp.push(-0.5, i / 4, 0, 0.5, i / 4, 0);
  const bi: number[] = [];
  for (let i = 0; i < 4; i++) bi.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  blade.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
  blade.setIndex(bi);
  const bladeGeo = keep(new THREE.InstancedBufferGeometry());
  bladeGeo.index = blade.index;
  bladeGeo.setAttribute("position", blade.getAttribute("position"));
  const base = new Float32Array(BLADES * 3);
  const info = new Float32Array(BLADES * 4);
  const DAISIES = 34;
  const dBase = new Float32Array(DAISIES * 3);
  const dInfo = new Float32Array(DAISIES * 3);
  for (let i = 0; i < BLADES; i++) {
    const z = 2.2 + rand() * 2.6;
    // the bottom of the screen at this depth (camera about 11.8 away, 40 degree lens)
    const bottom = -(11.8 - z) * Math.tan((20 * Math.PI) / 180) - 0.12;
    const x = -9.5 + rand() * 20;
    // shorter in front of the door and the backpack, so the threshold stays clear
    const low = Math.abs(x - 0.6) < 2.6 ? 0.45 : 1;
    base.set([x, bottom + rand() * 0.25, z], i * 3);
    info.set([(0.22 + rand() * 0.5) * low, 0.022 + rand() * 0.02, (rand() - 0.5) * 0.5, rand()], i * 4);
    if (i < DAISIES) {
      dBase.set([x, bottom + 0.05 + rand() * 0.2, z + 0.01], i * 3);
      dInfo.set([(0.25 + rand() * 0.35) * low, 0.05 + rand() * 0.04, rand()], i * 3);
    }
  }
  bladeGeo.setAttribute("aBase", new THREE.InstancedBufferAttribute(base, 3));
  bladeGeo.setAttribute("aBlade", new THREE.InstancedBufferAttribute(info, 4));
  bladeGeo.instanceCount = BLADES;
  blade.dispose();
  const grass = new THREE.Mesh(
    bladeGeo,
    keep(
      new THREE.ShaderMaterial({
        vertexShader: BLADE_VERT,
        fragmentShader: BLADE_FRAG,
        uniforms: { uTime: time, uWind: wind, uFade: fade },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),
  );
  grass.frustumCulled = false;
  grass.renderOrder = 8;
  group.add(grass);

  const daisyGeo = keep(new THREE.InstancedBufferGeometry());
  const dq = new THREE.PlaneGeometry(2, 2);
  daisyGeo.index = dq.index;
  daisyGeo.setAttribute("position", dq.getAttribute("position"));
  daisyGeo.setAttribute("uv", dq.getAttribute("uv"));
  daisyGeo.setAttribute("aBase", new THREE.InstancedBufferAttribute(dBase, 3));
  daisyGeo.setAttribute("aDaisy", new THREE.InstancedBufferAttribute(dInfo, 3));
  daisyGeo.instanceCount = DAISIES;
  const daisies = new THREE.Mesh(
    daisyGeo,
    keep(
      new THREE.ShaderMaterial({
        vertexShader: DAISY_VERT,
        fragmentShader: DAISY_FRAG,
        uniforms: { uTime: time, uWind: wind, uFade: fade },
        transparent: true,
        depthWrite: false,
      }),
    ),
  );
  daisies.frustumCulled = false;
  daisies.renderOrder = 8.5;
  group.add(daisies);
  [quad, dq].forEach((g) => trash.push(g));

  return {
    group,
    update: (t, w, show) => {
      time.value = t;
      wind.value = w;
      fade.value = show;
      // the branch: a slow sway with the gusts and a quicker tremble on top
      const gust = 0.6 + 0.4 * Math.sin(t * 0.55 - 0.8);
      angle.value = (Math.sin(t * 0.8) * 0.012 + Math.sin(t * 2.1 + 1.0) * 0.004) * gust * w;
    },
    dispose: () => trash.forEach((d) => d.dispose()),
  };
}
