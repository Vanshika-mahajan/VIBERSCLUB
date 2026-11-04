import * as THREE from "three";

/**
 * The world behind the door: deep midnight, a luminous galaxy band, stars at every distance.
 * Colours from the cosmic reference: midnight blue and black, cyan, a little violet, warm gold.
 * Milestone 4 adds the sphere to this scene.
 */

function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 uBand;
  varying vec3 vDir;
  void main() {
    float b = 1.0 - abs(dot(vDir, uBand));
    float glow = pow(b, 6.0);
    // the Energy Orb's night: near-black indigo, a breath lighter along the galaxy's plane
    vec3 deep = vec3(0.0016, 0.0009, 0.0045);
    vec3 midnight = vec3(0.003, 0.002, 0.009);
    vec3 c = mix(deep, midnight, glow);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const STAR_VERT = /* glsl */ `
  attribute float size;
  attribute vec3 tint;
  attribute float phase;
  uniform float uTime;
  uniform float uPixel;
  varying vec3 vTint;
  varying float vTw;
  void main() {
    vTint = tint;
    vTw = 0.75 + 0.25 * sin(uTime * (0.6 + phase) + phase * 40.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixel;
    gl_Position = projectionMatrix * mv;
  }
`;
const STAR_FRAG = /* glsl */ `
  varying vec3 vTint;
  varying float vTw;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float core = smoothstep(0.5, 0.0, d);
    float a = core * core;
    gl_FragColor = vec4(vTint * a * vTw, 1.0);
  }
`;

export type Cosmos = {
  scene: THREE.Scene;
  uniforms: { time: THREE.IUniform<number>; pixel: THREE.IUniform<number> };
};

export function makeCosmos(): Cosmos {
  const scene = new THREE.Scene();
  const rand = seeded(1979);
  const time = { value: 0 };
  const pixel = { value: 1 };
  // the galaxy's plane, tilted across the view like the Milky Way in the reference
  const band = new THREE.Vector3(0.42, 0.91, 0.0).normalize();

  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(900, 48, 24),
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: { uBand: { value: band } },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    ),
  );

  // lavender and white, as around the Energy Orb
  const palette = [
    new THREE.Color(1, 1, 1),
    new THREE.Color(0.78, 0.78, 1),
    new THREE.Color(0.62, 0.6, 1),
    new THREE.Color(0.85, 0.8, 1),
    new THREE.Color(0.7, 0.75, 1),
  ];

  const points = (
    n: number,
    place: (i: number) => THREE.Vector3,
    size: () => number,
    bright: () => number,
    colours: THREE.Color[],
  ) => {
    const pos = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const tints = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = place(i);
      pos.set([v.x, v.y, v.z], i * 3);
      sizes[i] = size();
      const c = colours[Math.floor(rand() * colours.length)]
        .clone()
        .multiplyScalar(bright());
      tints.set([c.r, c.g, c.b], i * 3);
      phases[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("tint", new THREE.BufferAttribute(tints, 3));
    g.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    return new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        uniforms: { uTime: time, uPixel: pixel },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
  };

  const onSphere = (r: number) => {
    const u = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return new THREE.Vector3(
      s * Math.cos(a),
      u,
      s * Math.sin(a),
    ).multiplyScalar(r);
  };
  // the band: points near the galaxy plane, denser toward its centre line
  const basis = (() => {
    const a = new THREE.Vector3(1, 0, 0).cross(band).normalize();
    const b = band.clone().cross(a).normalize();
    return { a, b };
  })();
  const inBand = (r: number, spread: number) => {
    const t = rand() * Math.PI * 2;
    const g = (rand() + rand() + rand() - 1.5) * spread;
    return basis.a
      .clone()
      .multiplyScalar(Math.cos(t))
      .add(basis.b.clone().multiplyScalar(Math.sin(t)))
      .add(band.clone().multiplyScalar(g))
      .normalize()
      .multiplyScalar(r);
  };

  // far dust of faint stars everywhere
  scene.add(
    points(
      12000,
      () => onSphere(600),
      () => 1 + rand() * 1.6,
      () => 0.5 + rand() * 0.7,
      palette,
    ),
  );
  // the galaxy band: thick with small stars in cyan, violet and gold
  scene.add(
    points(
      5000,
      () => inBand(580, 0.22),
      () => 1 + rand() * 1.6,
      () => 0.2 + rand() * 0.35,
      [palette[1], palette[2], palette[3], palette[4]],
    ),
  );
  // its glowing core: many wide, faint points that melt into one haze
  scene.add(
    points(
      2600,
      () => inBand(560, 0.09),
      () => 40 + rand() * 60,
      () => 0.0015 + rand() * 0.002,
      [palette[2], palette[3], palette[1], palette[4]],
    ),
  );
  // a few bright stars that bloom
  scene.add(
    points(
      260,
      () => onSphere(500),
      () => 2.5 + rand() * 3,
      () => 1.6 + rand() * 2.4,
      palette,
    ),
  );

  return { scene, uniforms: { time, pixel } };
}
