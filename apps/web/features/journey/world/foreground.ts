import * as THREE from "three";
import { DOOR, GRASS } from "./layout";

/** The front grass (ARPIT's cut-out) standing where the ground enters the frame, swaying in the wind. */
const GRASS_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float sway = sin(uTime * 1.4 + p.x * 0.9) * 0.06 + sin(uTime * 2.3 + p.x * 2.1) * 0.025;
    p.x += sway * uWind * uv.y * uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const GRASS_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uDusk;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.02) discard;
    c.rgb = mix(c.rgb, c.rgb * vec3(0.025, 0.035, 0.09), uDusk);
    gl_FragColor = c;
    #include <colorspace_fragment>
  }
`;

const MOTE_VERT = /* glsl */ `
  attribute float seed;
  uniform float uTime;
  uniform float uPixel;
  uniform float uLife;
  varying float vA;
  void main() {
    vec3 p = position;
    float t = uTime * (0.08 + seed * 0.06) + seed * 10.0;
    p.y += mod(t, 1.0) * 0.9;
    p.x += sin(t * 6.2831 + seed * 30.0) * 0.25;
    vA = sin(mod(t, 1.0) * 3.14159) * uLife;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = min((2.0 + seed * 3.0) * (6.0 / -mv.z), 5.0) * uPixel;
    gl_Position = projectionMatrix * mv;
  }
`;
const MOTE_FRAG = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA;
    gl_FragColor = vec4(vec3(1.0, 0.9, 0.6) * a * 1.4, 1.0);
  }
`;

export type Foreground = {
  group: THREE.Group;
  uniforms: {
    time: THREE.IUniform<number>;
    wind: THREE.IUniform<number>;
    dusk: THREE.IUniform<number>;
    pixel: THREE.IUniform<number>;
    life: THREE.IUniform<number>;
  };
};

export function makeForeground(grassTex: THREE.Texture): Foreground {
  const group = new THREE.Group();
  const time = { value: 0 };
  const wind = { value: 1 };
  const dusk = { value: 0 };
  const pixel = { value: 1 };
  const life = { value: 1 };

  const height = GRASS.width * (447 / 1774);
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(GRASS.width, height, 24, 4),
    new THREE.ShaderMaterial({
      vertexShader: GRASS_VERT,
      fragmentShader: GRASS_FRAG,
      uniforms: {
        uMap: { value: grassTex },
        uTime: time,
        uWind: wind,
        uDusk: dusk,
      },
      transparent: true,
      depthWrite: false,
    }),
  );
  grass.position.set(0, height / 2 - 0.05, GRASS.z);
  grass.renderOrder = 6;
  group.add(grass);

  // pollen in the low sun, between us and the door
  const n = 220;
  const pos = new Float32Array(n * 3);
  const seeds = new Float32Array(n);
  let s = 7;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    pos.set(
      [
        (rand() - 0.5) * 12,
        0.15 + rand() * 1.1,
        -3 - rand() * (Math.abs(DOOR.z) - 1),
      ],
      i * 3,
    );
    seeds[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const motes = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      vertexShader: MOTE_VERT,
      fragmentShader: MOTE_FRAG,
      uniforms: { uTime: time, uPixel: pixel, uLife: life },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  motes.renderOrder = 5;
  group.add(motes);
  return { group, uniforms: { time, wind, dusk, pixel, life } };
}
