import * as THREE from "three";

/**
 * The globe, in the style ARPIT chose: a dark sphere whose continents are drawn in glowing cyan dots,
 * a bright cyan rim, and flight paths arcing across it toward Manali, with pulses travelling along
 * them. The coastlines come from Natural Earth (public domain), rasterised into
 * /journey/earth-land.png (equirectangular, white = land). Around Manali the surface becomes a
 * holographic map of the valley: contour lines, the glowing Beas and the warm lights of villages.
 */

export const PLANET_RADIUS = 6;
const DEG = Math.PI / 180;
/** Manali, 32.24° N 77.19° E */
export const MANALI = { lat: 32.24 * DEG, lon: 77.19 * DEG };

/** latitude and longitude (radians) to a unit vector; longitude 0 faces +z */
export function toDir(lat: number, lon: number) {
  return new THREE.Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  );
}
const manaliDir = toDir(MANALI.lat, MANALI.lon);

/** where the flight paths start: they all arc toward Manali */
const CITIES: [number, number][] = [
  [28.61, 77.21], // Delhi
  [19.08, 72.88], // Mumbai
  [12.97, 77.59], // Bengaluru
  [22.57, 88.36], // Kolkata
  [51.51, -0.13], // London
  [52.52, 13.4], // Berlin
  [48.86, 2.35], // Paris
  [32.09, 34.78], // Tel Aviv
  [35.69, 51.39], // Tehran
  [25.2, 55.27], // Dubai
  [55.76, 37.62], // Moscow
  [1.35, 103.82], // Singapore
  [35.68, 139.69], // Tokyo
  [-33.87, 151.21], // Sydney
  [40.71, -74.01], // New York
  [37.77, -122.42], // San Francisco
  [-23.55, -46.63], // São Paulo
  [-33.92, 18.42], // Cape Town
  [27.72, 85.32], // Kathmandu
];

// Simplex noise in 3D: Stefan Gustavson and Ashima Arts (MIT).
const NOISE = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
  float fbm(vec3 p) {
    float f = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { f += a * snoise(p); p *= 2.03; a *= 0.5; }
    return f;
  }
  float ridged(vec3 p) {
    float f = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { float n = 1.0 - abs(snoise(p)); f += a * n * n; p *= 2.1; a *= 0.5; }
    return f;
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const SPHERE_VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vPos = normalize(position);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

// The body of the globe: nearly black, lit faintly on one side, with a cyan rim; the valley near Manali.
const SPHERE_FRAG = /* glsl */ `
  uniform float uManali;
  uniform float uTime;
  uniform vec3 uManaliDir;
  uniform vec3 uEast;
  uniform vec3 uNorth;
  uniform vec3 uLight;
  uniform sampler2D uLand;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vWorld;
  ${NOISE}

  void main() {
    vec3 p = vPos;
    vec3 n = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vWorld);
    float facing = max(dot(n, view), 0.0);
    float lit = 0.35 + 0.65 * smoothstep(-0.4, 0.9, dot(n, uLight));

    // the ocean: deep blue-black, a faint glow toward the limb
    vec3 col = vec3(0.003, 0.008, 0.016) + vec3(0.006, 0.03, 0.06) * pow(1.0 - facing, 3.0) * lit;
    // land, softly, under the dots
    vec2 uv = vec2(atan(p.x, p.z) / 6.2831853 + 0.5, 0.5 - asin(clamp(p.y, -1.0, 1.0)) / 3.1415927);
    float land = texture2D(uLand, uv).r;
    col += vec3(0.004, 0.018, 0.03) * land * lit;

    // the valley around Manali, as a holographic map
    float dist = acos(clamp(dot(p, uManaliDir), -1.0, 1.0));
    float region = (1.0 - smoothstep(0.08, 0.2, dist)) * uManali;
    vec2 q = vec2(dot(p, uEast), dot(p, uNorth)) / 0.18;
    float ridge = ridged(vec3(q * 2.0, 4.0));
    float riverX = sin(q.y * 2.6) * 0.16 + snoise(vec3(q.y * 1.4, 2.0, 9.0)) * 0.08;
    float valley = exp(-pow(q.x - riverX, 2.0) * 9.0);
    float height = ridge * (1.0 - valley * 0.8);
    float line = 1.0 - smoothstep(0.0, 0.08, abs(fract(height * 11.0) - 0.5) * 2.0 - 0.86);
    float peaks = smoothstep(0.58, 0.72, height);
    vec3 holo = vec3(0.004, 0.02, 0.04) + vec3(0.06, 0.32, 0.45) * line * (0.35 + height)
      + vec3(0.55, 0.85, 1.0) * peaks * 0.35;
    float river = exp(-pow(q.x - riverX, 2.0) * 5200.0);
    vec2 cell = floor(q * 14.0);
    vec2 jitter = vec2(hash(cell + 3.1), hash(cell + 7.7)) * 0.6 + 0.2;
    float lights = step(0.8, hash(cell)) * valley * smoothstep(0.16, 0.0, length(fract(q * 14.0) - jitter));
    holo += vec3(0.35, 0.95, 1.0) * river * 1.5 + vec3(1.0, 0.72, 0.36) * lights * 1.8;
    col = mix(col, holo, region);

    // the rim: cyan light along the edge (brighter than white at its peak, so it blooms a little)
    float rim = pow(1.0 - facing, 3.2);
    col += vec3(0.16, 0.58, 0.95) * rim * (0.5 + lit) * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Continents as dots. Each dot twinkles a little; dots fade on the far side and under the valley.
const DOT_VERT = /* glsl */ `
  attribute float seed;
  uniform float uPixel;
  uniform float uScale;
  uniform float uTime;
  uniform float uManali;
  uniform vec3 uManaliDir;
  varying float vA;
  varying vec3 vWorldN;
  varying vec3 vWorld;
  void main() {
    vec3 dir = normalize(position);
    float dist = acos(clamp(dot(dir, uManaliDir), -1.0, 1.0));
    vA = (0.55 + 0.45 * sin(uTime * (0.6 + seed) + seed * 40.0)) * (1.0 - (1.0 - smoothstep(0.06, 0.2, dist)) * uManali);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vWorldN = normalize(mat3(modelMatrix) * dir);
    vec4 mv = viewMatrix * w;
    gl_PointSize = clamp(uScale / -mv.z, 1.1, 4.0) * uPixel;
    gl_Position = projectionMatrix * mv;
  }
`;
const DOT_FRAG = /* glsl */ `
  varying float vA;
  varying vec3 vWorldN;
  varying vec3 vWorld;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.35, d);
    float facing = dot(vWorldN, normalize(cameraPosition - vWorld));
    float edge = smoothstep(-0.05, 0.35, facing);
    vec3 c = mix(vec3(0.16, 0.6, 0.92), vec3(0.55, 0.9, 1.0), smoothstep(0.8, 1.0, vA));
    gl_FragColor = vec4(c * a * vA * edge * 0.36, 1.0);
  }
`;

// Flight paths: a faint line with a bright pulse travelling toward Manali.
const ARC_VERT = /* glsl */ `
  attribute float along;
  attribute float offset;
  varying float vAlong;
  varying float vOffset;
  void main() {
    vAlong = along;
    vOffset = offset;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ARC_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying float vAlong;
  varying float vOffset;
  void main() {
    float head = fract(uTime * 0.16 + vOffset);
    float behind = head - vAlong;
    float pulse = behind >= 0.0 ? exp(-behind * 14.0) : 0.0;
    float ends = smoothstep(0.0, 0.05, vAlong) * smoothstep(1.0, 0.95, vAlong);
    vec3 c = vec3(0.35, 0.8, 1.0) * (0.1 + pulse * 1.2) * ends;
    gl_FragColor = vec4(c * uOpacity, 1.0);
  }
`;

const HALO_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const HALO_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    float rim = dot(normalize(vNormal), normalize(cameraPosition - vWorld));
    // a thin shell: the glow rises from its edge to the globe's edge, then hides behind the globe
    float glow = pow(smoothstep(0.0, -0.32, rim), 3.0);
    gl_FragColor = vec4(vec3(0.16, 0.55, 0.95) * glow * 0.3 * uOpacity, 1.0);
  }
`;

// The marker: a bright core, a soft halo and a ring that keeps pulsing outward.
const MARK_VERT = /* glsl */ `
  uniform float uPixel;
  uniform float uSize;
  void main() {
    gl_PointSize = uSize * uPixel;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const MARK_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(0.07, 0.0, d) * 3.0;
    float halo = exp(-d * d * 22.0) * 0.7;
    float t = fract(uTime * 0.55);
    float ring = smoothstep(0.035, 0.0, abs(d - (0.18 + t * 0.8))) * (1.0 - t) * 1.6;
    vec3 c = vec3(1.0, 0.82, 0.52) * (core + halo) + vec3(1.0, 0.7, 0.45) * ring;
    gl_FragColor = vec4(c * uOpacity, 1.0);
  }
`;

export type Planet = {
  /** placed in front of the camera each frame */
  root: THREE.Group;
  /** tilts Manali's latitude toward us */
  tilt: THREE.Group;
  /** spins around the poles */
  spin: THREE.Group;
  marker: THREE.Points;
  uniforms: {
    time: THREE.IUniform<number>;
    manali: THREE.IUniform<number>;
    marker: THREE.IUniform<number>;
    halo: THREE.IUniform<number>;
    pixel: THREE.IUniform<number>;
  };
  /** spin and tilt that put Manali at the centre of the face toward us */
  facing: { spin: number; tilt: number };
  dispose: () => void;
};

/** Points spread evenly over the sphere (a Fibonacci lattice), kept where the land mask is white. */
function landDots(mask: HTMLImageElement, count: number) {
  const w = mask.naturalWidth;
  const h = mask.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(mask, 0, 0);
  const px = g.getImageData(0, 0, w, h).data;
  const pos: number[] = [];
  const seeds: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r;
    const lon = Math.atan2(x, z);
    const lat = Math.asin(y);
    const u = Math.min(w - 1, Math.floor((lon / (2 * Math.PI) + 0.5) * w));
    const v = Math.min(h - 1, Math.floor((0.5 - lat / Math.PI) * h));
    if (px[(v * w + u) * 4] < 128) continue;
    const k = PLANET_RADIUS * 1.003;
    pos.push(x * k, y * k, z * k);
    seeds.push(((i * 2654435761) % 1000) / 1000);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
  return geo;
}

/** Great-circle arcs from each city to Manali, lifted off the surface in the middle. */
function flightPaths() {
  const pos: number[] = [];
  const along: number[] = [];
  const offset: number[] = [];
  const index: number[] = [];
  const steps = 64;
  let base = 0;
  CITIES.forEach(([lat, lon], c) => {
    const a = toDir(lat * DEG, lon * DEG);
    const angle = a.angleTo(manaliDir);
    const lift = 0.015 + angle * 0.045;
    const sin = Math.sin(angle);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      // spherical interpolation along the great circle
      const p = a
        .clone()
        .multiplyScalar(Math.sin((1 - t) * angle) / sin)
        .add(manaliDir.clone().multiplyScalar(Math.sin(t * angle) / sin));
      const k = PLANET_RADIUS * (1.004 + lift * Math.sin(Math.PI * t));
      pos.push(p.x * k, p.y * k, p.z * k);
      along.push(t);
      offset.push((c * 0.37) % 1);
      if (s) index.push(base + s - 1, base + s);
    }
    base += steps + 1;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("along", new THREE.Float32BufferAttribute(along, 1));
  geo.setAttribute("offset", new THREE.Float32BufferAttribute(offset, 1));
  geo.setIndex(index);
  return geo;
}

export async function makePlanet(): Promise<Planet> {
  const mask = await new THREE.ImageLoader().loadAsync(
    "/journey/earth-land.png",
  );
  const landTex = new THREE.Texture(mask);
  landTex.needsUpdate = true;
  landTex.colorSpace = THREE.NoColorSpace;

  const time = { value: 0 };
  const manali = { value: 0 };
  const marker = { value: 0 };
  const halo = { value: 1 };
  const pixel = { value: 1 };
  const east = new THREE.Vector3(0, 1, 0).cross(manaliDir).normalize();
  const north = manaliDir.clone().cross(east).normalize();
  const md = { value: manaliDir };

  const root = new THREE.Group();
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  root.add(tilt);
  tilt.add(spin);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 128, 96),
    new THREE.ShaderMaterial({
      vertexShader: SPHERE_VERT,
      fragmentShader: SPHERE_FRAG,
      uniforms: {
        uTime: time,
        uManali: manali,
        uManaliDir: md,
        uEast: { value: east },
        uNorth: { value: north },
        uLight: { value: new THREE.Vector3(-0.5, 0.45, 0.75).normalize() },
        uLand: { value: landTex },
      },
    }),
  );
  spin.add(sphere);

  const dots = new THREE.Points(
    landDots(mask, 130000),
    new THREE.ShaderMaterial({
      vertexShader: DOT_VERT,
      fragmentShader: DOT_FRAG,
      uniforms: {
        uPixel: pixel,
        uScale: { value: 40 },
        uTime: time,
        uManali: manali,
        uManaliDir: md,
      },
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  dots.renderOrder = 2;
  spin.add(dots);

  const arcs = new THREE.LineSegments(
    flightPaths(),
    new THREE.ShaderMaterial({
      vertexShader: ARC_VERT,
      fragmentShader: ARC_FRAG,
      uniforms: { uTime: time, uOpacity: halo },
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  arcs.renderOrder = 3;
  spin.add(arcs);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS * 1.08, 96, 64),
    new THREE.ShaderMaterial({
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      uniforms: { uOpacity: halo },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  root.add(atmosphere);

  const markGeo = new THREE.BufferGeometry();
  const at = manaliDir.clone().multiplyScalar(PLANET_RADIUS * 1.006);
  markGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([at.x, at.y, at.z], 3),
  );
  const mark = new THREE.Points(
    markGeo,
    new THREE.ShaderMaterial({
      vertexShader: MARK_VERT,
      fragmentShader: MARK_FRAG,
      uniforms: {
        uOpacity: marker,
        uTime: time,
        uPixel: pixel,
        uSize: { value: 96 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  mark.renderOrder = 10;
  spin.add(mark);

  return {
    root,
    tilt,
    spin,
    marker: mark,
    uniforms: { time, manali, marker, halo, pixel },
    facing: { spin: -MANALI.lon, tilt: MANALI.lat },
    dispose: () => landTex.dispose(),
  };
}
