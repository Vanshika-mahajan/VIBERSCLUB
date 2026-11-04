import * as THREE from "three";

/**
 * The globe: Earth, in the look of ThreeUI's "Energy Orb" (MIT, Meng To). Deep indigo seas,
 * continents in periwinkle with a light along every coast, and the orb's violet smoke drifting over
 * them as cloud. The coastlines come from Natural Earth (public domain), rasterised at 4096 x 2048
 * into /journey/earth-land.png (equirectangular, white = land). Around Manali the surface becomes a
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

// The orb, after ThreeUI's Energy Orb shader (MIT), with ARPIT's settings: smoke scale 1.86, smoke
// strength 1.06, hue -15°, saturation 0.78, brightness 1.19, no outer glow.
const ORB = /* glsl */ `
  float vhash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vnoise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(vhash(i), vhash(i + vec3(1, 0, 0)), f.x), mix(vhash(i + vec3(0, 1, 0)), vhash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(vhash(i + vec3(0, 0, 1)), vhash(i + vec3(1, 0, 1)), f.x), mix(vhash(i + vec3(0, 1, 1)), vhash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float vfbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + vec3(1.7); a *= 0.5; } return v; }
  vec3 grade(vec3 c, float hue, float sat) {
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, sat);
    vec3 axis = normalize(vec3(1.0));
    return max(vec3(0.0), c * cos(hue) + cross(axis, c) * sin(hue) + axis * dot(axis, c) * (1.0 - cos(hue)));
  }
  // Earth under the orb's smoke. land: 0 sea … 1 land; coast: a thin band along the shore
  vec3 orb(vec3 sp, float t, float land, float coast) {
    const float scale = 1.86;
    float f1 = vfbm(sp * (2.6 * scale) + vec3(0.0, t * 0.012, 0.0));
    float f2 = vfbm(sp * (4.5 * scale) - vec3(t * 0.008, 0.0, t * 0.005) + f1 * 1.8);
    float veil = smoothstep(0.38, 0.8, f2);
    float detail = vfbm(sp * 16.0) * 0.7 + vfbm(sp * 44.0) * 0.3;
    // seas: the orb's deep indigo, a little smoke in them
    vec3 sea = mix(vec3(0.03, 0.018, 0.1), vec3(0.1, 0.07, 0.3), f1 * 0.9);
    // land: periwinkle, textured like terrain seen from orbit
    vec3 ground = mix(vec3(0.2, 0.17, 0.52), vec3(0.42, 0.4, 0.86), smoothstep(0.3, 0.7, detail));
    vec3 col = mix(sea, ground, land);
    col += vec3(0.55, 0.55, 1.0) * coast * 0.55;
    // the smoke drifts over everything as cloud, thinner than the orb's so the continents read
    col = mix(col, vec3(0.7, 0.68, 1.0), clamp(veil * 0.62, 0.0, 1.0));
    return grade(col, radians(-15.0), 0.78) * 1.19;
  }
`;

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
  ${ORB}

  void main() {
    vec3 p = vPos;
    vec3 n = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vWorld);
    float facing = max(dot(n, view), 0.0);

    // the land mask, without a seam where longitude wraps (pick whichever u is continuous here)
    float lon = atan(p.x, p.z) / 6.2831853;
    float v = 0.5 - asin(clamp(p.y, -1.0, 1.0)) / 3.1415927;
    // two equivalent u's (the texture repeats): each breaks at a different meridian
    float uA = lon + 0.5;
    float uB = fract(lon) + 0.5;
    vec2 uv = vec2(fwidth(uA) <= fwidth(uB) ? uA : uB, v);
    float mask = texture2D(uLand, uv).r;
    float land = smoothstep(0.35, 0.65, mask);
    float coast = 1.0 - smoothstep(0.0, 0.32, abs(mask - 0.5));

    // the orb's colours are display colours; the renderer works in linear light
    vec3 col = pow(orb(p, uTime, land, coast), vec3(2.2));
    // daylight on one side, a soft night side, and a thin violet atmosphere at the limb
    float lit = 0.38 + 0.62 * smoothstep(-0.35, 0.85, dot(n, uLight));
    col *= lit;
    col *= mix(0.6, 1.0, smoothstep(0.0, 0.35, facing));
    col += vec3(0.32, 0.3, 0.95) * pow(1.0 - facing, 3.5) * 0.35 * lit;
    // a soft glint of the light on the seas
    vec3 h = normalize(uLight + view);
    col += vec3(0.5, 0.5, 1.0) * pow(max(dot(n, h), 0.0), 60.0) * 0.25 * (1.0 - land);

    // the valley around Manali, as a holographic map in the orb's violet
    float dist = acos(clamp(dot(p, uManaliDir), -1.0, 1.0));
    float region = (1.0 - smoothstep(0.08, 0.2, dist)) * uManali;
    vec2 q = vec2(dot(p, uEast), dot(p, uNorth)) / 0.18;
    float ridge = ridged(vec3(q * 2.0, 4.0));
    float riverX = sin(q.y * 2.6) * 0.16 + snoise(vec3(q.y * 1.4, 2.0, 9.0)) * 0.08;
    float valley = exp(-pow(q.x - riverX, 2.0) * 9.0);
    float height = ridge * (1.0 - valley * 0.8);
    float line = 1.0 - smoothstep(0.0, 0.08, abs(fract(height * 11.0) - 0.5) * 2.0 - 0.86);
    float peaks = smoothstep(0.58, 0.72, height);
    vec3 holo = vec3(0.006, 0.004, 0.03) + vec3(0.16, 0.13, 0.6) * line * (0.35 + height)
      + vec3(0.75, 0.72, 1.0) * peaks * 0.35;
    float river = exp(-pow(q.x - riverX, 2.0) * 5200.0);
    vec2 cell = floor(q * 14.0);
    vec2 jitter = vec2(hash(cell + 3.1), hash(cell + 7.7)) * 0.6 + 0.2;
    float lights = step(0.8, hash(cell)) * valley * smoothstep(0.16, 0.0, length(fract(q * 14.0) - jitter));
    holo += vec3(0.6, 0.62, 1.0) * river * 1.5 + vec3(1.0, 0.72, 0.36) * lights * 1.8;
    col = mix(col, holo, region);
    gl_FragColor = vec4(col, 1.0);
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
    pixel: THREE.IUniform<number>;
  };
  /** spin and tilt that put Manali at the centre of the face toward us */
  facing: { spin: number; tilt: number };
  dispose: () => void;
};

export async function makePlanet(maxAniso = 8): Promise<Planet> {
  const mask = await new THREE.ImageLoader().loadAsync(
    "/journey/earth-land.png",
  );
  const landTex = new THREE.Texture(mask);
  landTex.colorSpace = THREE.NoColorSpace;
  landTex.anisotropy = maxAniso;
  landTex.wrapS = THREE.RepeatWrapping;
  landTex.flipY = false; // row 0 is the north pole, as v = 0 is
  landTex.needsUpdate = true;

  const time = { value: 0 };
  const manali = { value: 0 };
  const marker = { value: 0 };
  const pixel = { value: 1 };
  const east = new THREE.Vector3(0, 1, 0).cross(manaliDir).normalize();
  const north = manaliDir.clone().cross(east).normalize();

  const root = new THREE.Group();
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  root.add(tilt);
  tilt.add(spin);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 192, 128),
    new THREE.ShaderMaterial({
      vertexShader: SPHERE_VERT,
      fragmentShader: SPHERE_FRAG,
      uniforms: {
        uTime: time,
        uManali: manali,
        uManaliDir: { value: manaliDir },
        uEast: { value: east },
        uNorth: { value: north },
        uLight: { value: new THREE.Vector3(-0.45, 0.4, 0.8).normalize() },
        uLand: { value: landTex },
      },
    }),
  );
  spin.add(sphere);

  // a thin violet atmosphere just beyond the edge
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS * 1.035, 128, 64),
    new THREE.ShaderMaterial({
      vertexShader: SPHERE_VERT,
      fragmentShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vWorld;
        void main() {
          vec3 view = normalize(cameraPosition - vWorld);
          float f = 1.0 - abs(dot(normalize(vNormal), view));
          // strongest just outside the planet's edge, fading to nothing at the shell's edge
          float glow = smoothstep(1.0, 0.86, f) * smoothstep(0.5, 0.9, f);
          gl_FragColor = vec4(vec3(0.2, 0.18, 0.7) * glow * glow * 0.3, 1.0);
        }
      `,
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
    uniforms: { time, manali, marker, pixel },
    facing: { spin: -MANALI.lon, tilt: MANALI.lat },
    dispose: () => landTex.dispose(),
  };
}
