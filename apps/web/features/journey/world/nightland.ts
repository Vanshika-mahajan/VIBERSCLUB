import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DOOR } from "./layout";

/**
 * The opening world: the door standing alone in a landscape at night. Rolling grass under a huge red
 * moon, mountains fading into haze behind, red maples shedding leaves, stone lanterns glowing beside
 * the door and sparks drifting in the air. The mood follows ThreeUI's "Temple Night" and the terrain
 * its "Landscape"; everything here is built from code, no photos.
 *
 * Every material shares the same few uniforms: the time, the wind, the light spilling from the open
 * door and "dusk", which sinks the whole place into darkness as we leave it.
 */

// ---------------------------------------------------------------- shared helpers

function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x: number, y: number) {
  let v = 0;
  let a = 0.5;
  for (let i = 0; i < 4; i++) {
    v += a * (noise2(x, y) - 0.5);
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.2;
    a *= 0.5;
  }
  return v * 2;
}
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** the stone path from where we stand to the door */
function pathX(z: number) {
  const t = Math.min(Math.max(-z / -DOOR.z, 0), 1);
  return DOOR.x * t + Math.sin(z * 0.35) * 0.18 * (1 - t);
}

/**
 * The ground's height. Two grassy mounds in front frame the view (as in Temple Night), the ground
 * rolls gently behind the door and rises into hills further back (as in Landscape). Around the door
 * and along the path it is level.
 */
export function groundHeight(x: number, z: number) {
  let h = fbm(x * 0.07, z * 0.07) * 0.9;
  // the land behind rises in long swells
  const back = Math.max(-z - 22, 0);
  h += back * 0.05 + fbm(x * 0.018 + 3, z * 0.018) * Math.min(back * 0.25, 9);
  // the mounds framing the view
  h += 3.1 * Math.exp(-((x + 5.4) ** 2 / 10 + (z + 7.5) ** 2 / 18));
  h += 2.0 * Math.exp(-((x - 6.0) ** 2 / 8 + (z + 9.0) ** 2 / 12));
  // the path and the door's level ground
  const onPath =
    z > DOOR.z - 0.5 && z < 2
      ? 1 - smoothstep(0.9, 2.6, Math.abs(x - pathX(z)))
      : 0;
  const atDoor =
    1 - smoothstep(1.8, 4.2, Math.hypot(x - DOOR.x, (z - DOOR.z) * 1.2));
  const flat = Math.max(onPath * 0.92, atDoor);
  return h * (1 - flat);
}

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), u.x), u.y);
  }
`;

// light shared by the ground, the grass and the trees: soft moonlight, the lanterns, the open door,
// distance haze, and the dusk that falls as we leave
const LIGHT = /* glsl */ `
  uniform vec3 uLamps[4];
  uniform float uTime;
  uniform float uDusk;
  uniform float uDay;
  uniform float uSpill;
  uniform vec3 uSpillAt;
  // night: near-black haze; day: the warm, dusty haze of the Landscape template
  vec3 haze() { return mix(vec3(0.011, 0.011, 0.015), vec3(0.5, 0.44, 0.29), uDay); }
  // the light a surface facing n receives: moonlight at night, low warm sun by day
  vec3 skyLight(vec3 n, vec3 night) {
    float sun = 0.45 + 0.55 * clamp(dot(n, normalize(vec3(0.35, 0.8, 0.45))), 0.0, 1.0);
    return mix(night, vec3(2.5, 2.25, 1.75) * sun, uDay);
  }
  vec3 lampLight(vec3 w) {
    vec3 l = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec3 d = w - uLamps[i];
      float flick = 0.92 + 0.08 * sin(uTime * 9.0 + float(i) * 2.3) * sin(uTime * 3.1 + float(i));
      l += vec3(1.0, 0.36, 0.12) * flick * 0.9 / (1.0 + dot(d, d) * 2.6);
    }
    return l * (1.0 - 0.9 * uDay);
  }
  vec3 doorLight(vec3 w) {
    vec2 d = (w.xz - uSpillAt.xz) * vec2(0.9, 0.42);
    return vec3(1.0, 0.68, 0.34) * uSpill * 1.4 * exp(-dot(d, d) * 1.4);
  }
  vec3 finish(vec3 c, vec3 w, float dist) {
    float fog = 1.0 - exp(-dist * mix(0.016, 0.011, uDay));
    // low mist lying in the hollows, thicker with distance
    fog = max(fog, (1.0 - smoothstep(0.0, 6.0, w.y)) * smoothstep(18.0, 90.0, dist) * 0.55);
    c = mix(c, haze(), clamp(fog, 0.0, 1.0));
    return mix(c, c * vec3(0.12, 0.12, 0.2), uDusk);
  }
`;

type Shared = {
  uTime: THREE.IUniform<number>;
  uDusk: THREE.IUniform<number>;
  uDay: THREE.IUniform<number>;
  uSpill: THREE.IUniform<number>;
  uSpillAt: THREE.IUniform<THREE.Vector3>;
  uLamps: THREE.IUniform<THREE.Vector3[]>;
};

// ---------------------------------------------------------------- the sky and the moon

/** where the moon hangs: right of the door, high in the frame (moved in on narrow screens) */
const MOON_DIR = new THREE.Vector3();
function moonDirection(azimuthDeg: number, out: THREE.Vector3) {
  const az = azimuthDeg * (Math.PI / 180);
  const el = 16.5 * (Math.PI / 180);
  return out.set(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    -Math.cos(az) * Math.cos(el),
  );
}
moonDirection(11, MOON_DIR);

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// the moon: a red disc on its own plane, so its face stays crisp; darker seas, a few craters, a dimmer edge
const MOON_FRAG = /* glsl */ `
  ${NOISE}
  uniform float uDusk;
  uniform float uDay;
  varying vec2 vUv;
  void main() {
    vec2 q = (vUv - 0.5) * 2.0;
    float r = length(q);
    if (r > 1.0) discard;
    float seas = vnoise(q * 2.2 + 4.0) * 0.55 + vnoise(q * 4.8 + 1.0) * 0.3 + vnoise(q * 11.0) * 0.15;
    vec3 moon = vec3(1.05, 0.2, 0.25) * (0.72 + 0.28 * sqrt(1.0 - r * r));
    moon = mix(moon, vec3(0.32, 0.03, 0.05), smoothstep(0.5, 0.72, seas) * 0.85);
    // small round craters
    vec2 g = q * 6.0;
    vec2 cell = floor(g);
    vec2 f = fract(g) - 0.5 - (vec2(hash(cell), hash(cell + 7.0)) - 0.5) * 0.5;
    float crater = step(0.72, hash(cell + 3.0)) * smoothstep(0.22, 0.12, length(f));
    moon *= 1.0 - crater * 0.35;
    // by day it is the sun, pale behind the haze
    moon = mix(moon, vec3(1.02, 0.94, 0.74) * (0.92 + 0.08 * sqrt(1.0 - r * r)), uDay);
    gl_FragColor = vec4(mix(moon, moon * 0.15, uDusk), 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  ${NOISE}
  uniform vec3 uMoon;
  uniform float uDusk;
  uniform float uDay;
  uniform float uTime;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float up = clamp(d.y, -0.2, 1.0);
    vec3 c = mix(vec3(0.014, 0.013, 0.017), vec3(0.002, 0.002, 0.004), smoothstep(-0.02, 0.4, up));
    vec3 day = mix(vec3(0.6, 0.53, 0.36), vec3(0.42, 0.4, 0.33), smoothstep(-0.02, 0.5, up));
    float m = dot(d, uMoon);
    // the red glow the moon throws into the haze
    c += (1.0 - uDay) * vec3(0.5, 0.025, 0.04) * (pow(max(m, 0.0), 260.0) * 0.45 + pow(max(m, 0.0), 40.0) * 0.08 + pow(max(m, 0.0), 8.0) * 0.012);
    // faint stars
    vec2 sp = vec2(atan(d.x, -d.z), d.y) * 160.0;
    float s = hash(floor(sp));
    float tw = 0.6 + 0.4 * sin(uTime * (1.0 + s * 3.0) + s * 50.0);
    day += vec3(0.5, 0.4, 0.22) * (pow(max(m, 0.0), 30.0) * 0.5 + pow(max(m, 0.0), 6.0) * 0.12);
    c = mix(c, day, uDay);
    c += (1.0 - uDay) * vec3(0.8, 0.85, 1.0) * smoothstep(0.997, 1.0, s) * smoothstep(0.02, 0.2, up) * 0.25 * tw * (1.0 - smoothstep(0.98, 0.999, m));
    c = mix(c, c * vec3(0.15, 0.15, 0.3), uDusk);
    gl_FragColor = vec4(c, 1.0);
  }
`;

// ---------------------------------------------------------------- mountains, layer on layer into the haze

const RIDGE_VERT = /* glsl */ `
  attribute float rise;
  varying float vRise;
  varying vec3 vWorld;
  void main() {
    vRise = rise;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const RIDGE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uMist;
  uniform vec3 uColorDay;
  uniform vec3 uMistDay;
  uniform float uDay;
  uniform float uDusk;
  uniform vec3 uMoon;
  varying float vRise;
  varying vec3 vWorld;
  void main() {
    // dark ridges, the haze lying thick at their feet
    vec3 c = mix(mix(uMist, uMistDay, uDay), mix(uColor, uColorDay, uDay), smoothstep(0.0, 0.55, vRise));
    // the slopes facing the moon catch a little red
    c += vec3(0.012, 0.001, 0.002) * smoothstep(0.5, 1.0, vRise) * smoothstep(0.6, 1.0, dot(normalize(vec3(vWorld.x, 0.0, vWorld.z)), normalize(vec3(uMoon.x, 0.0, uMoon.z))));
    gl_FragColor = vec4(mix(c, c * vec3(0.15, 0.15, 0.3), uDusk), 1.0);
  }
`;

function ridge(
  dist: number,
  height: number,
  seed: number,
  shared: Shared,
  color: THREE.Color,
  mist: THREE.Color,
  colorDay: THREE.Color,
) {
  const seg = 360;
  const half = dist * 2.4;
  const pos: number[] = [];
  const rise: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const x = -half + (2 * half * i) / seg;
    const u = x / dist;
    // peaks: sharpened noise, so the ridge line has summits like the Landscape template
    let n = 0;
    let a = 1;
    let f = 1.6;
    for (let k = 0; k < 5; k++) {
      n += a * (1 - Math.abs(noise2(u * f + seed, seed * 3.1) * 2 - 1));
      a *= 0.5;
      f *= 2.1;
    }
    const top = (n / 1.9) ** 2.2 * height;
    pos.push(x, -12, -dist, x, top, -dist);
    rise.push(0, 1);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("rise", new THREE.Float32BufferAttribute(rise, 1));
  g.setIndex(index);
  const mesh = new THREE.Mesh(
    g,
    new THREE.ShaderMaterial({
      vertexShader: RIDGE_VERT,
      fragmentShader: RIDGE_FRAG,
      uniforms: {
        uColor: { value: color },
        uMist: { value: mist },
        uColorDay: { value: colorDay },
        uMistDay: { value: new THREE.Color(0.55, 0.48, 0.32) },
        uDay: shared.uDay,
        uDusk: shared.uDusk,
        uMoon: { value: MOON_DIR },
      },
      depthWrite: false,
    }),
  );
  return mesh;
}

// ---------------------------------------------------------------- the ground

const GROUND_VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normal;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const GROUND_FRAG = /* glsl */ `
  ${NOISE}
  ${LIGHT}
  uniform vec3 uPathA;
  varying vec3 vWorld;
  varying vec3 vNormal;
  float pathX(float z) {
    float t = clamp(-z / ${(-DOOR.z).toFixed(3)}, 0.0, 1.0);
    return ${DOOR.x.toFixed(3)} * t + sin(z * 0.35) * 0.18 * (1.0 - t);
  }
  void main() {
    vec3 n = normalize(vNormal);
    float pat = vnoise(vWorld.xz * 0.35) * 0.6 + vnoise(vWorld.xz * 1.7) * 0.4;
    vec3 grass = mix(vec3(0.008, 0.014, 0.004), vec3(0.018, 0.03, 0.008), pat);
    // the stone path: flagstones, worn at the edges
    float onPath = vWorld.z > ${(DOOR.z - 0.2).toFixed(3)} && vWorld.z < 1.5 ? 1.0 - smoothstep(0.55, 0.85, abs(vWorld.x - pathX(vWorld.z)) + (vnoise(vWorld.xz * 6.0) - 0.5) * 0.25) : 0.0;
    vec2 cell = vec2(vWorld.x * 1.6, vWorld.z * 1.25);
    vec2 f = fract(cell + vec2(0.5 * step(1.0, mod(floor(cell.y), 2.0)), 0.0));
    float joint = smoothstep(0.0, 0.06, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
    vec3 stone = mix(vec3(0.008, 0.008, 0.009), vec3(0.04, 0.038, 0.04) * (0.8 + 0.4 * hash(floor(cell))), joint);
    vec3 albedo = mix(grass, stone, onPath);
    float moon = 0.35 + 0.65 * clamp(dot(n, normalize(vec3(-0.3, 0.9, 0.35))), 0.0, 1.0);
    vec3 c = albedo * skyLight(n, vec3(0.42, 0.5, 0.4) * moon + 0.1) * mix(vec3(1.0), vec3(1.1, 1.25, 0.7), uDay) + albedo * lampLight(vWorld) * 7.0 + albedo * doorLight(vWorld) * 5.0;
    gl_FragColor = vec4(finish(c, vWorld, length(vWorld - cameraPosition)), 1.0);
  }
`;

function makeGround(shared: Shared) {
  // a grid that is fine near us and coarse far away
  const nx = 220;
  const nz = 180;
  const pos: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= nz; j++) {
    const v = j / nz;
    const z = 6 - 300 * v * v;
    const halfW = 30 + 600 * v * v;
    for (let i = 0; i <= nx; i++) {
      const x = -halfW + (2 * halfW * i) / nx;
      pos.push(x, groundHeight(x, z), z);
    }
  }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + nx + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return new THREE.Mesh(
    g,
    new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT,
      fragmentShader: GROUND_FRAG,
      uniforms: { ...shared, uPathA: { value: new THREE.Vector3() } },
    }),
  );
}

// ---------------------------------------------------------------- grass: blades swaying in the wind

const BLADE_VERT = /* glsl */ `
  attribute vec3 aBase;
  attribute vec4 aBlade; // height, width, facing angle, seed
  uniform float uTime;
  uniform float uWind;
  varying float vY;
  varying float vSeed;
  varying vec3 vWorld;
  void main() {
    float h = aBlade.x;
    float y = position.y;
    float ca = cos(aBlade.z);
    float sa = sin(aBlade.z);
    vec3 p = vec3(position.x * aBlade.y * (1.0 - y * 0.85) * ca, y * h, position.x * aBlade.y * (1.0 - y * 0.85) * sa);
    // a gust rolls across the field; each blade also leans its own way
    float gust = sin(uTime * 1.3 + aBase.x * 0.35 + aBase.z * 0.22) * 0.5 + sin(uTime * 2.7 + aBase.x * 1.1) * 0.2;
    float lean = (aBlade.w - 0.5) * 0.5 + gust * uWind * 0.55;
    p.x += lean * y * y * h;
    p.z += (fract(aBlade.w * 7.0) - 0.5) * 0.4 * y * y * h;
    vec4 w = vec4(aBase + p, 1.0);
    vY = y;
    vSeed = aBlade.w;
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const BLADE_FRAG = /* glsl */ `
  ${LIGHT}
  varying float vY;
  varying float vSeed;
  varying vec3 vWorld;
  void main() {
    vec3 root = vec3(0.006, 0.009, 0.003);
    vec3 tip = mix(vec3(0.035, 0.065, 0.015), vec3(0.07, 0.09, 0.03), vSeed);
    vec3 albedo = mix(root, tip, smoothstep(0.0, 1.0, vY));
    vec3 c = albedo * mix(vec3(0.72, 0.66, 0.72), vec3(3.4, 2.8, 1.8) * (0.75 + 0.25 * vY), uDay);
    // the tips catch the moon's red from behind
    c += (1.0 - uDay) * vec3(0.05, 0.006, 0.006) * pow(vY, 3.0) * step(0.55, vSeed);
    c += albedo * lampLight(vWorld) * 6.0 + albedo * doorLight(vWorld) * 5.0;
    gl_FragColor = vec4(finish(c, vWorld, length(vWorld - cameraPosition)), 1.0);
  }
`;

function makeGrass(
  shared: Shared,
  wind: THREE.IUniform<number>,
  count: number,
) {
  const rand = seeded(42);
  // one blade: a strip of three segments, narrowing to a point
  const blade = new THREE.BufferGeometry();
  const bp: number[] = [];
  const segs = 3;
  for (let i = 0; i <= segs; i++) {
    const y = i / segs;
    bp.push(-0.5, y, 0, 0.5, y, 0);
  }
  const bi: number[] = [];
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    bi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  blade.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
  blade.setIndex(bi);

  const g = new THREE.InstancedBufferGeometry();
  g.index = blade.index;
  g.attributes.position = blade.attributes.position;
  const base = new Float32Array(count * 3);
  const info = new Float32Array(count * 4);
  let n = 0;
  while (n < count) {
    const u = rand();
    const z = 2 - 46 * u ** 1.8;
    const spread = 3 + Math.abs(z) * 0.95;
    const x = (rand() * 2 - 1) * spread;
    const onPath =
      z > DOOR.z - 0.4 && Math.abs(x - pathX(z)) < 0.75 + (rand() - 0.5) * 0.3;
    if (onPath) continue;
    const nearDoor = Math.hypot(x - DOOR.x, z - DOOR.z) < 1.1;
    const y = groundHeight(x, z);
    const far = Math.max(-z - 6, 0);
    base.set([x, y - 0.02, z], n * 3);
    info.set(
      [
        (0.16 + rand() * 0.26) * (nearDoor ? 0.5 : 1) * (1 + far * 0.02),
        0.07 + far * 0.004,
        rand() * Math.PI,
        rand(),
      ],
      n * 4,
    );
    n++;
  }
  g.setAttribute("aBase", new THREE.InstancedBufferAttribute(base, 3));
  g.setAttribute("aBlade", new THREE.InstancedBufferAttribute(info, 4));
  g.instanceCount = count;
  const mesh = new THREE.Mesh(
    g,
    new THREE.ShaderMaterial({
      vertexShader: BLADE_VERT,
      fragmentShader: BLADE_FRAG,
      uniforms: { ...shared, uWind: wind },
      side: THREE.DoubleSide,
    }),
  );
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------- red maples

const LEAF_VERT = /* glsl */ `
  attribute vec3 tint;
  attribute float size;
  attribute float seed;
  uniform float uScale;
  uniform float uTime;
  uniform float uWind;
  varying vec3 vTint;
  varying vec3 vWorld;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 1.6 + seed * 20.0 + p.y) * 0.03 * uWind;
    p.y += sin(uTime * 2.1 + seed * 13.0) * 0.015 * uWind;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    vTint = tint;
    vWorld = p;
    vSeed = seed;
    gl_PointSize = size * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
// a five-pointed maple leaf, drawn in the point
const MAPLE = /* glsl */ `
  float maple(vec2 q) {
    float a = atan(q.x, q.y);
    float r = length(q);
    float lobes = 0.30 + 0.17 * pow(abs(cos(a * 2.5)), 0.6);
    return smoothstep(lobes, lobes - 0.05, r);
  }
`;
const LEAF_FRAG = /* glsl */ `
  ${LIGHT}
  ${MAPLE}
  varying vec3 vTint;
  varying vec3 vWorld;
  varying float vSeed;
  void main() {
    float ang = vSeed * 6.2831;
    vec2 q = gl_PointCoord - 0.5;
    q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
    float a = maple(q);
    if (a < 0.5) discard;
    vec3 c = vTint * mix(1.0, 1.7, uDay) + vTint * lampLight(vWorld) * 1.6 + vTint * doorLight(vWorld);
    gl_FragColor = vec4(finish(c, vWorld, length(vWorld - cameraPosition)), 1.0);
  }
`;

const BARK_FRAG = /* glsl */ `
  ${LIGHT}
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec3 albedo = vec3(0.012, 0.01, 0.01);
    float moon = 0.4 + 0.6 * clamp(dot(normalize(vNormal), normalize(vec3(-0.3, 0.6, 0.6))), 0.0, 1.0);
    vec3 c = albedo * skyLight(normalize(vNormal), vec3(moon)) * mix(1.0, 2.5, uDay) + albedo * lampLight(vWorld) * 2.0;
    gl_FragColor = vec4(finish(c, vWorld, length(vWorld - cameraPosition)), 1.0);
  }
`;

type TreeSpec = {
  x: number;
  z: number;
  scale: number;
  seed: number;
  lean: number;
};

function makeTrees(
  specs: TreeSpec[],
  shared: Shared,
  wind: THREE.IUniform<number>,
  scale: THREE.IUniform<number>,
) {
  const parts: THREE.BufferGeometry[] = [];
  const leafPos: number[] = [];
  const leafTint: number[] = [];
  const leafSize: number[] = [];
  const leafSeed: number[] = [];
  const reds = [
    new THREE.Color(0.32, 0.008, 0.02),
    new THREE.Color(0.45, 0.015, 0.03),
    new THREE.Color(0.22, 0.005, 0.015),
    new THREE.Color(0.6, 0.03, 0.04),
  ];
  const up = new THREE.Vector3(0, 1, 0);

  for (const t of specs) {
    const rand = seeded(t.seed);
    const branch = (
      from: THREE.Vector3,
      dir: THREE.Vector3,
      len: number,
      radius: number,
      depth: number,
    ) => {
      const to = from.clone().addScaledVector(dir, len);
      const g = new THREE.CylinderGeometry(radius * 0.7, radius, len, 6, 1);
      g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
      g.translate(from.x, from.y, from.z);
      parts.push(g);
      if (depth === 0 || radius < 0.02) {
        // a cloud of leaves at the twig's end
        const k = Math.round(36 + rand() * 40);
        const r = 0.55 + rand() * 0.45;
        for (let i = 0; i < k; i++) {
          const v = new THREE.Vector3(
            rand() * 2 - 1,
            (rand() * 2 - 1) * 0.6,
            rand() * 2 - 1,
          );
          if (v.lengthSq() > 1) {
            i--;
            continue;
          }
          v.multiplyScalar(r * t.scale).add(to);
          leafPos.push(v.x, v.y, v.z);
          const c = reds[Math.floor(rand() * reds.length)].clone();
          // leaves on top are brighter, those underneath in shade
          c.multiplyScalar(0.55 + 0.6 * ((v.y - to.y) / (r * t.scale) + 0.6));
          leafTint.push(c.r, c.g, c.b);
          leafSize.push((0.11 + rand() * 0.1) * t.scale);
          leafSeed.push(rand());
        }
        return;
      }
      const kids = depth > 2 ? 2 : 2 + (rand() > 0.5 ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const spread = 0.5 + rand() * 0.45;
        const turn = rand() * Math.PI * 2;
        const side = new THREE.Vector3(Math.cos(turn), 0, Math.sin(turn));
        const d = dir
          .clone()
          .multiplyScalar(Math.cos(spread))
          .addScaledVector(side, Math.sin(spread))
          .add(new THREE.Vector3(t.lean * 0.15, 0.08, 0))
          .normalize();
        branch(to, d, len * (0.62 + rand() * 0.2), radius * 0.62, depth - 1);
      }
    };
    const y = groundHeight(t.x, t.z);
    branch(
      new THREE.Vector3(t.x, y - 0.2, t.z),
      new THREE.Vector3(t.lean, 1, 0).normalize(),
      1.9 * t.scale,
      0.16 * t.scale,
      4,
    );
  }

  const group = new THREE.Group();
  const bark = mergeGeometries(parts);
  if (bark) {
    group.add(
      new THREE.Mesh(
        bark,
        new THREE.ShaderMaterial({
          vertexShader: GROUND_VERT,
          fragmentShader: BARK_FRAG,
          uniforms: { ...shared },
        }),
      ),
    );
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(leafPos, 3));
  lg.setAttribute("tint", new THREE.Float32BufferAttribute(leafTint, 3));
  lg.setAttribute("size", new THREE.Float32BufferAttribute(leafSize, 1));
  lg.setAttribute("seed", new THREE.Float32BufferAttribute(leafSeed, 1));
  group.add(
    new THREE.Points(
      lg,
      new THREE.ShaderMaterial({
        vertexShader: LEAF_VERT,
        fragmentShader: LEAF_FRAG,
        uniforms: { ...shared, uWind: wind, uScale: scale },
      }),
    ),
  );
  return group;
}

// ---------------------------------------------------------------- stone lanterns

const GLOW_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uDusk;
  uniform float uDay;
  uniform float uSeed;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float flick = 0.9 + 0.1 * sin(uTime * 8.0 + uSeed) * sin(uTime * 2.7 + uSeed * 3.0);
    float a = exp(-d * d * 4.5) * 0.55 + exp(-d * d * 40.0) * 0.6;
    vec3 c = vec3(0.9, 0.12, 0.08) * a * 0.6 * flick * (1.0 - uDusk * 0.7) * (1.0 - uDay * 0.85);
    gl_FragColor = vec4(c, 1.0);
  }
`;
const UV_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function makeLantern(
  x: number,
  z: number,
  s: number,
  shared: Shared,
  seed: number,
) {
  const y = groundHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(s);
  const stone = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERT,
    fragmentShader: /* glsl */ `
      ${LIGHT}
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec3 albedo = vec3(0.05, 0.047, 0.047);
        float moon = 0.3 + 0.7 * clamp(dot(normalize(vNormal), normalize(vec3(-0.3, 0.7, 0.6))), 0.0, 1.0);
        vec3 c = albedo * skyLight(normalize(vNormal), vec3(moon * 0.35)) + albedo * lampLight(vWorld) * 1.4;
        gl_FragColor = vec4(finish(c, vWorld, length(vWorld - cameraPosition)), 1.0);
      }
    `,
    uniforms: { ...shared },
  });
  const add = (g: THREE.BufferGeometry, py: number) => {
    const m = new THREE.Mesh(g, stone);
    m.position.y = py;
    group.add(m);
  };
  add(new THREE.BoxGeometry(0.56, 0.14, 0.56), 0.07);
  add(new THREE.CylinderGeometry(0.08, 0.11, 0.78, 8), 0.53);
  add(new THREE.BoxGeometry(0.5, 0.08, 0.5), 0.96);
  // the light box: four corner posts around a glowing core
  for (const [px, pz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    add(
      new THREE.BoxGeometry(0.06, 0.3, 0.06).translate(px * 0.15, 0, pz * 0.15),
      1.15,
    );
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.24, 0.26),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.15, 0.42) }),
  );
  core.position.y = 1.15;
  group.add(core);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.26, 4), stone);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.43;
  group.add(roof);
  add(new THREE.SphereGeometry(0.06, 8, 6), 1.6);

  // the red halo around it, always facing us
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.ShaderMaterial({
      vertexShader: UV_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: {
        uTime: shared.uTime,
        uDusk: shared.uDusk,
        uDay: shared.uDay,
        uSeed: { value: seed },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.position.y = 1.15;
  halo.renderOrder = 7;
  group.add(halo);
  return {
    group,
    halo,
    light: new THREE.Vector3(x, y + 1.15 * s, z),
  };
}

// ---------------------------------------------------------------- falling leaves and sparks

const FALL_VERT = /* glsl */ `
  attribute float seed;
  uniform float uTime;
  uniform float uScale;
  uniform float uLife;
  varying float vSeed;
  varying float vFlip;
  varying vec3 vWorld;
  void main() {
    vec3 p = position;
    float speed = 0.35 + seed * 0.35;
    float t = uTime * speed + seed * 40.0;
    p.y = 0.2 + mod(position.y - uTime * speed, 9.0);
    p.x += sin(t * 1.3) * 0.7 + uTime * 0.25 * (0.5 + seed);
    p.x = mod(p.x + 14.0, 28.0) - 14.0;
    p.z += cos(t * 0.9) * 0.4;
    vFlip = abs(cos(t * 2.2));
    vSeed = seed;
    vWorld = p;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_PointSize = (0.14 + seed * 0.1) * uScale / -mv.z * uLife;
    gl_Position = projectionMatrix * mv;
  }
`;
const FALL_FRAG = /* glsl */ `
  ${LIGHT}
  ${MAPLE}
  uniform float uTime2;
  varying float vSeed;
  varying float vFlip;
  varying vec3 vWorld;
  void main() {
    float ang = vSeed * 40.0 + uTime * (0.6 + vSeed);
    vec2 q = gl_PointCoord - 0.5;
    q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
    q.x /= max(vFlip, 0.25);
    if (maple(q) < 0.5) discard;
    vec3 c = mix(vec3(0.4, 0.012, 0.03), vec3(0.62, 0.04, 0.04), vSeed) * (0.45 + 0.55 * vFlip);
    c *= mix(1.0, 2.2, uDay);
    c += c * lampLight(vWorld);
    gl_FragColor = vec4(finish(c, vWorld, length(vWorld - cameraPosition)), 1.0);
  }
`;
const SPARK_VERT = /* glsl */ `
  attribute float seed;
  uniform float uTime;
  uniform float uPixel;
  uniform float uLife;
  varying float vA;
  void main() {
    vec3 p = position;
    float t = uTime * (0.05 + seed * 0.05) + seed * 10.0;
    p.y += sin(t * 6.2831) * 0.35 + mod(t, 1.0) * 0.6;
    p.x += sin(t * 6.2831 * 0.7 + seed * 30.0) * 0.5;
    vA = pow(0.5 + 0.5 * sin(uTime * (1.5 + seed * 2.0) + seed * 60.0), 3.0) * uLife;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = min((2.0 + seed * 2.5) * (7.0 / -mv.z), 4.5) * uPixel;
    gl_Position = projectionMatrix * mv;
  }
`;
const SPARK_FRAG = /* glsl */ `
  uniform float uDusk;
  uniform float uDay;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA * (1.0 - uDusk) * (1.0 - uDay);
    gl_FragColor = vec4(vec3(1.0, 0.92, 0.85) * a * 1.6, 1.0);
  }
`;

// ---------------------------------------------------------------- the whole place

export type Nightland = {
  group: THREE.Group;
  uniforms: {
    time: THREE.IUniform<number>;
    dusk: THREE.IUniform<number>;
    /** 0 night … 1 day */
    day: THREE.IUniform<number>;
    spill: THREE.IUniform<number>;
    wind: THREE.IUniform<number>;
    life: THREE.IUniform<number>;
    pixel: THREE.IUniform<number>;
    /** pixels per metre at one metre away: the drawing height over 2·tan(fov/2) */
    scale: THREE.IUniform<number>;
  };
  /** turn the lantern halos to face the camera, and keep the moon in the frame on narrow screens */
  face: (camera: THREE.PerspectiveCamera) => void;
};

export function makeNightland(options: { grass?: number } = {}): Nightland {
  const time = { value: 0 };
  const dusk = { value: 0 };
  const day = { value: 0 };
  const spill = { value: 0 };
  const wind = { value: 1 };
  const life = { value: 1 };
  const pixel = { value: 1 };
  const scale = { value: 800 };
  const lamps = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  const shared: Shared = {
    uTime: time,
    uDusk: dusk,
    uDay: day,
    uSpill: spill,
    uSpillAt: { value: new THREE.Vector3(DOOR.x, 0, DOOR.z + 2.2) },
    uLamps: { value: lamps },
  };
  const group = new THREE.Group();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 24),
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uMoon: { value: MOON_DIR },
        uDusk: dusk,
        uDay: day,
        uTime: time,
      },
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  sky.renderOrder = -10;
  group.add(sky);
  const moonR = 800 * Math.tan(5.6 * (Math.PI / 180));
  const moon = new THREE.Mesh(
    new THREE.PlaneGeometry(moonR * 2, moonR * 2),
    new THREE.ShaderMaterial({
      vertexShader: UV_VERT,
      fragmentShader: MOON_FRAG,
      uniforms: { uDusk: dusk, uDay: day },
      depthWrite: false,
    }),
  );
  moon.position.copy(MOON_DIR).multiplyScalar(800);
  moon.lookAt(0, 0, 0);
  moon.renderOrder = -9.5;
  let moonAz = 11;
  group.add(moon);

  // three ranges, nearer ones darker, the farthest almost lost in the haze
  const mist = new THREE.Color(0.03, 0.026, 0.032);
  const ranges = [
    ridge(
      520,
      120,
      11.3,
      shared,
      new THREE.Color(0.009, 0.009, 0.012),
      mist,
      new THREE.Color(0.42, 0.37, 0.25),
    ),
    ridge(
      340,
      62,
      5.7,
      shared,
      new THREE.Color(0.005, 0.006, 0.008),
      mist,
      new THREE.Color(0.3, 0.28, 0.17),
    ),
    ridge(
      230,
      30,
      2.1,
      shared,
      new THREE.Color(0.003, 0.004, 0.004),
      mist,
      new THREE.Color(0.19, 0.19, 0.1),
    ),
  ];
  ranges.forEach((r, i) => {
    r.renderOrder = -9 + i;
    group.add(r);
  });

  group.add(makeGround(shared));
  group.add(makeGrass(shared, wind, options.grass ?? 60000));

  group.add(
    makeTrees(
      [
        { x: -8.5, z: -17, scale: 1.25, seed: 3, lean: 0.15 },
        { x: 6.6, z: -8.5, scale: 1.0, seed: 8, lean: -0.3 },
        { x: 8.5, z: -19, scale: 1.15, seed: 21, lean: -0.1 },
        { x: -14, z: -26, scale: 1.4, seed: 34, lean: 0.2 },
        { x: 15, z: -30, scale: 1.5, seed: 55, lean: -0.15 },
      ],
      shared,
      wind,
      scale,
    ),
  );

  const lanterns = [
    makeLantern(DOOR.x - 1.95, DOOR.z + 0.7, 1, shared, 1),
    makeLantern(DOOR.x + 1.95, DOOR.z + 0.7, 1, shared, 2),
    makeLantern(pathX(-6.2) - 1.45, -6.2, 0.55, shared, 3),
    makeLantern(pathX(-6.2) + 1.45, -6.2, 0.55, shared, 4),
  ];
  lanterns.forEach((l, i) => {
    lamps[i].copy(l.light);
    group.add(l.group);
  });

  // red leaves drifting down across the whole view
  {
    const rand = seeded(77);
    const n = 320;
    const pos = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set([(rand() * 2 - 1) * 14, rand() * 9, -1.5 - rand() * 22], i * 3);
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
    const fall = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        vertexShader: FALL_VERT,
        fragmentShader: FALL_FRAG,
        uniforms: { ...shared, uScale: scale, uLife: life, uTime2: time },
      }),
    );
    fall.frustumCulled = false;
    group.add(fall);
  }

  // pale sparks hanging in the air around the door
  {
    const rand = seeded(5);
    const n = 240;
    const pos = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set(
        [
          DOOR.x + (rand() * 2 - 1) * 7,
          0.3 + rand() * 3.2,
          DOOR.z + 4 - rand() * 9,
        ],
        i * 3,
      );
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
    const sparks = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        vertexShader: SPARK_VERT,
        fragmentShader: SPARK_FRAG,
        uniforms: {
          uTime: time,
          uPixel: pixel,
          uLife: life,
          uDusk: dusk,
          uDay: day,
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sparks.renderOrder = 8;
    group.add(sparks);
  }

  return {
    group,
    uniforms: { time, dusk, day, spill, wind, life, pixel, scale },
    face: (camera) => {
      for (const l of lanterns) l.halo.quaternion.copy(camera.quaternion);
      const halfH =
        Math.atan(
          Math.tan((camera.fov / 2) * (Math.PI / 180)) * camera.aspect,
        ) /
        (Math.PI / 180);
      const az = Math.min(12, halfH * 0.5);
      if (Math.abs(az - moonAz) > 0.01) {
        moonAz = az;
        moonDirection(az, MOON_DIR);
        moon.position.copy(MOON_DIR).multiplyScalar(800);
        moon.lookAt(0, 0, 0);
      }
    },
  };
}
