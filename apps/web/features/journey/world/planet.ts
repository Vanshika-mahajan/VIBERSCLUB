import * as THREE from "three";

/**
 * The colourful Earth-like sphere. Everything is drawn by the shader, so there is no texture to
 * download: continents from 3D noise in emerald, gold and rose; teal seas with a sun glint; drifting
 * clouds; a cyan rim of atmosphere. Around Manali the surface turns, artistically, into the valley:
 * snowy ridges, contour lines, the glowing Beas river and the warm lights of villages along it.
 */

export const PLANET_RADIUS = 6;
const DEG = Math.PI / 180;
/** Manali, 32.24° N 77.19° E, in the sphere's own coordinates (longitude 0 faces +z) */
export const MANALI = { lat: 32.24 * DEG, lon: 77.19 * DEG };
const manaliDir = new THREE.Vector3(
  Math.cos(MANALI.lat) * Math.sin(MANALI.lon),
  Math.sin(MANALI.lat),
  Math.cos(MANALI.lat) * Math.cos(MANALI.lon),
);
/** light from the upper left and in front, so the face toward us is lit */
const SUN = new THREE.Vector3(-0.55, 0.42, 0.72).normalize();

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

const VERT = /* glsl */ `
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

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uManali;
  uniform vec3 uSun;
  uniform vec3 uManaliDir;
  uniform vec3 uEast;
  uniform vec3 uNorth;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vWorld;
  ${NOISE}

  void main() {
    vec3 p = vPos;
    vec3 n = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vWorld);
    float near = dot(p, uManaliDir);
    float dist = acos(clamp(near, -1.0, 1.0));

    // continents, with land always under the Himalaya
    float boost = 0.24 * exp(-dist * dist * 14.0);
    float h = fbm(p * 1.55 + vec3(3.1, 0.0, 1.7)) + boost - 0.04;
    float land = smoothstep(0.0, 0.05, h);
    float hue = snoise(p * 2.4 + 7.0);
    vec3 deep = vec3(0.035, 0.09, 0.32);
    vec3 shallow = vec3(0.07, 0.48, 0.66);
    vec3 sea = mix(deep, shallow, smoothstep(-0.32, 0.0, h));
    vec3 emerald = vec3(0.10, 0.52, 0.30);
    vec3 gold = vec3(0.88, 0.66, 0.28);
    vec3 rose = vec3(0.86, 0.40, 0.52);
    vec3 violet = vec3(0.46, 0.34, 0.78);
    vec3 ground = mix(emerald, gold, smoothstep(0.05, 0.32, h + hue * 0.12));
    ground = mix(ground, rose, smoothstep(0.25, 0.8, hue) * 0.65);
    ground = mix(ground, violet, smoothstep(0.45, 0.9, -hue) * 0.45);
    float lat = abs(p.y);
    ground = mix(ground, vec3(0.74, 0.77, 0.82), clamp(smoothstep(0.42, 0.55, h - boost) + smoothstep(0.8, 0.92, lat), 0.0, 1.0));
    vec3 col = mix(sea, ground, land);
    col = mix(col, vec3(0.72, 0.77, 0.84), smoothstep(0.86, 0.95, lat) * (1.0 - land));

    // Manali, drawn as the valley: local east/north coordinates, about 0.2 rad across
    float region = (1.0 - smoothstep(0.1, 0.24, dist)) * uManali;
    vec2 q = vec2(dot(p, uEast), dot(p, uNorth)) / 0.2;
    vec3 qp = vec3(q * 2.2, 4.0);
    float ridge = ridged(qp);
    float riverX = sin(q.y * 2.6) * 0.16 + snoise(vec3(q.y * 1.4, 2.0, 9.0)) * 0.08;
    float valley = exp(-pow(q.x - riverX, 2.0) * 9.0);
    float height = ridge * (1.0 - valley * 0.75);
    vec3 m = mix(vec3(0.05, 0.24, 0.17), vec3(0.18, 0.48, 0.28), smoothstep(0.15, 0.4, height));
    m = mix(m, vec3(0.55, 0.46, 0.38), smoothstep(0.45, 0.56, height));
    m = mix(m, vec3(0.86, 0.88, 0.93), smoothstep(0.6, 0.7, height));
    float contour = 1.0 - smoothstep(0.0, 0.06, abs(fract(height * 9.0) - 0.5) * 2.0 - 0.9);
    m += vec3(0.9, 0.75, 0.45) * contour * 0.14 * (1.0 - valley);
    float river = exp(-pow(q.x - riverX, 2.0) * 5200.0);
    vec2 cell = floor(q * 14.0);
    vec2 jitter = vec2(hash(cell + 3.1), hash(cell + 7.7)) * 0.6 + 0.2;
    float lights = step(0.8, hash(cell)) * valley * smoothstep(0.16, 0.0, length(fract(q * 14.0) - jitter));
    // a soft dusk ring frames the valley as it appears
    col *= 1.0 - 0.35 * uManali * smoothstep(0.1, 0.2, dist) * (1.0 - smoothstep(0.2, 0.42, dist));
    col = mix(col, m, region);

    // light: soft terminator, a glint on the sea
    float sun = dot(n, uSun);
    float lit = 0.12 + 0.8 * smoothstep(-0.2, 0.65, sun);
    col *= lit;
    vec3 refl = reflect(-uSun, n);
    col += vec3(1.0, 0.92, 0.75) * pow(max(dot(refl, view), 0.0), 36.0) * 0.55 * (1.0 - land);
    // the night side twinkles with towns
    float night = smoothstep(0.05, -0.3, sun) * land;
    col += vec3(1.0, 0.7, 0.35) * step(0.93, hash(floor(p.xy * 120.0) + floor(p.z * 60.0))) * night * 0.9;

    // the valley glows: river and village lights are brighter than white, so they bloom
    col += region * (vec3(0.35, 0.95, 1.0) * river * 1.3 + vec3(1.0, 0.72, 0.36) * lights * 1.8);

    // clouds drift, and part over Manali
    float cloud = smoothstep(0.18, 0.62, fbm(p * 2.6 + vec3(uTime * 0.012, 0.0, uTime * 0.006)));
    col = mix(col, vec3(0.92) * (0.2 + lit * 0.82), cloud * 0.66 * (1.0 - region));

    // rim of atmosphere
    float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    col += vec3(0.30, 0.58, 1.0) * fres * (0.4 + lit) * 0.7;
    gl_FragColor = vec4(col, 1.0);
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
  uniform vec3 uSun;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec3 view = normalize(cameraPosition - vWorld);
    float rim = dot(normalize(vNormal), view);
    // back faces of a shell 1.16× the planet: rim is 0 at the shell's edge and about -0.5 at the
    // planet's edge, so the glow rises from nothing to its brightest against the planet
    float glow = pow(smoothstep(0.0, -0.5, rim), 2.2);
    float lit = 0.35 + 0.65 * smoothstep(-0.5, 0.8, dot(normalize(vNormal), uSun));
    gl_FragColor = vec4(mix(vec3(0.25, 0.55, 1.0), vec3(0.62, 0.42, 1.0), 0.35) * glow * lit * 0.85 * uOpacity, 1.0);
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
};

export function makePlanet(): Planet {
  const time = { value: 0 };
  const manali = { value: 0 };
  const marker = { value: 0 };
  const halo = { value: 1 };
  const pixel = { value: 1 };
  const sun = { value: SUN };
  const east = new THREE.Vector3(0, 1, 0).cross(manaliDir).normalize();
  const north = manaliDir.clone().cross(east).normalize();

  const root = new THREE.Group();
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  root.add(tilt);
  tilt.add(spin);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 160, 120),
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: time,
        uManali: manali,
        uSun: sun,
        uManaliDir: { value: manaliDir },
        uEast: { value: east },
        uNorth: { value: north },
      },
    }),
  );
  spin.add(sphere);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS * 1.16, 96, 64),
    new THREE.ShaderMaterial({
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      uniforms: { uSun: sun, uOpacity: halo },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  root.add(atmosphere);

  const markGeo = new THREE.BufferGeometry();
  const at = manaliDir.clone().multiplyScalar(PLANET_RADIUS * 1.004);
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
  };
}
