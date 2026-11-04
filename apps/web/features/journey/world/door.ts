import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { DOOR, JAMB_DEPTH, LEAF, LEAF_CENTER_Y } from "./layout";
import { softShadowTexture } from "./meadow";

/**
 * The door as an object: the frame (ARPIT's image, with its doorway cut out), a leaf with real
 * thickness on a hinge, the doorway itself (a window onto the cosmos, filled with light), shafts of light
 * that reach toward us, and the shadow it casts on the grass.
 */

const PORTAL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The doorway shows the cosmos render (sampled in screen space, so it lines up as if seen through a
// window), covered by light. As we pass through, the light opens from the centre outward.
const PORTAL_FRAG = /* glsl */ `
  uniform sampler2D uCosmos;
  uniform vec2 uRes;
  uniform float uLight;
  uniform float uIris;
  uniform float uSeam;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec3 cosmos = texture2D(uCosmos, gl_FragCoord.xy / uRes).rgb;
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.85);
    float r = length(p) / 0.95;
    float haze = 0.12 * (1.0 - smoothstep(0.3, 1.2, uIris));
    float lit = uLight * (haze + (1.0 - haze) * smoothstep(uIris, uIris + 0.75, r));
    float flicker = 0.96 + 0.04 * sin(uTime * 7.0 + vUv.y * 9.0);
    vec3 warm = mix(vec3(1.0, 0.95, 0.86) * 3.2, vec3(1.0, 0.62, 0.30) * 1.8, smoothstep(0.0, 1.1, r)) * flicker;
    vec3 c = mix(cosmos, warm, clamp(lit, 0.0, 1.0));
    // before it opens, a warm line of light shows at the seam
    c += vec3(1.0, 0.72, 0.40) * 4.0 * uSeam * (1.0 - uLight);
    gl_FragColor = vec4(c, 1.0);
  }
`;

// Shafts of light: a widening tunnel from the doorway toward us, streaked, fading with distance.
const RAYS_VERT = /* glsl */ `
  attribute float along;
  attribute float around;
  varying float vAlong;
  varying float vAround;
  void main() {
    vAlong = along;
    vAround = around;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const RAYS_FRAG = /* glsl */ `
  uniform float uRays;
  uniform float uTime;
  varying float vAlong;
  varying float vAround;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float noise(float x) { float i = floor(x); float f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
  void main() {
    float streak = noise(vAround * 26.0 + uTime * 0.15) * 0.7 + noise(vAround * 61.0 - uTime * 0.1) * 0.5;
    float fade = pow(1.0 - vAlong, 2.2) * smoothstep(0.0, 0.06, vAlong);
    float a = uRays * fade * streak * 0.11;
    gl_FragColor = vec4(vec3(1.0, 0.78, 0.48) * a * 2.0, 1.0);
  }
`;

function raysGeometry(w: number, h: number, length: number, spread: number) {
  // four walls of a frustum, each subdivided so the streaks run along the light
  const seg = 48;
  const positions: number[] = [];
  const along: number[] = [];
  const around: number[] = [];
  const index: number[] = [];
  const ring = (t: number, s: number) => {
    // a point on the rectangle's perimeter, s in 0..1
    const per = s * 4;
    const side = Math.floor(per) % 4;
    const f = per - Math.floor(per);
    const hw = (w / 2) * (1 + (spread - 1) * t);
    const hh = (h / 2) * (1 + (spread - 1) * t);
    const pts = [
      [-hw + 2 * hw * f, hh],
      [hw, hh - 2 * hh * f],
      [hw - 2 * hw * f, -hh],
      [-hw, -hh + 2 * hh * f],
    ][side];
    return pts;
  };
  for (let i = 0; i <= seg * 4; i++) {
    const s = i / (seg * 4);
    for (let j = 0; j <= 1; j++) {
      const [x, y] = ring(j, s);
      positions.push(x, y, j * length);
      along.push(j);
      around.push(s);
    }
  }
  for (let i = 0; i < seg * 4; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("along", new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute("around", new THREE.Float32BufferAttribute(around, 1));
  g.setIndex(index);
  return g;
}

// The painted face of the leaf. Not flat paint: a soft occlusion along the hinge, a sheen that slides
// across as it turns, and warm light catching the latch edge once the doorway is lit.
const FACE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FACE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uTurn;
  uniform float uLight;
  varying vec2 vUv;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.02) discard;
    vec3 c = tex.rgb * uTint;
    // turning away from us, the face falls into shade
    c *= 1.0 - 0.5 * uTurn;
    // soft occlusion where the leaf meets the hinge, and a little at the top and bottom
    c *= mix(0.72, 1.0, smoothstep(0.0, 0.16, vUv.x));
    c *= mix(0.86, 1.0, smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y));
    // a broad sheen that travels from the latch side to the hinge as the door swings
    float band = exp(-pow((vUv.x - (1.05 - uTurn * 1.3)) / 0.22, 2.0));
    c += uTint * band * 0.09 * (1.0 - uTurn * 0.6);
    // warm light from the doorway catches the latch edge
    float lip = smoothstep(0.82, 1.0, vUv.x);
    c += vec3(1.0, 0.7, 0.42) * lip * uLight * (0.25 + 0.75 * uTurn) * 0.9;
    gl_FragColor = vec4(c, tex.a);
    #include <colorspace_fragment>
  }
`;

// The reveal: the doorway's inner walls, so it has depth as we approach. Stone in the dark, warmed by
// the light pouring in from the far end.
const JAMB_VERT = /* glsl */ `
  attribute float deep;
  varying float vDeep;
  varying vec2 vUv;
  void main() {
    vDeep = deep;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const JAMB_FRAG = /* glsl */ `
  uniform vec3 uTint;
  uniform float uLight;
  varying float vDeep;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  void main() {
    vec3 stone = vec3(0.42, 0.34, 0.33) * (0.9 + 0.1 * hash(floor(vUv * vec2(6.0, 40.0))));
    vec3 c = stone * uTint * mix(0.55, 0.9, vDeep);
    vec3 warm = vec3(1.0, 0.68, 0.40);
    c += warm * uLight * (0.15 + 0.85 * vDeep * vDeep) * 1.1;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

/** four inward-facing walls from the doorway's face back to `depth`, with 0 at the front and 1 at the back */
function jambGeometry(w: number, h: number, depth: number) {
  const hw = w / 2;
  const hh = h / 2;
  // each wall: two front corners, two back corners, normal pointing into the opening
  const walls: [number, number, number, number][] = [
    [-hw, -hh, -hw, hh], // left
    [hw, hh, hw, -hh], // right
    [-hw, hh, hw, hh], // top
    [hw, -hh, -hw, -hh], // threshold
  ];
  const positions: number[] = [];
  const deep: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  walls.forEach(([x0, y0, x1, y1], i) => {
    const b = i * 4;
    positions.push(x0, y0, 0, x1, y1, 0, x0, y0, -depth, x1, y1, -depth);
    deep.push(0, 0, 1, 1);
    uv.push(0, 0, 1, 0, 0, 1, 1, 1);
    index.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("deep", new THREE.Float32BufferAttribute(deep, 1));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

export type Door = {
  group: THREE.Group;
  hinge: THREE.Group;
  frame: THREE.Mesh;
  tint: (k: number) => void;
  shade: (angle: number) => void;
  uniforms: {
    light: THREE.IUniform<number>;
    iris: THREE.IUniform<number>;
    seam: THREE.IUniform<number>;
    rays: THREE.IUniform<number>;
    time: THREE.IUniform<number>;
    res: THREE.IUniform<THREE.Vector2>;
    cosmos: THREE.IUniform<THREE.Texture | null>;
  };
  rays: THREE.Mesh;
};

export function makeDoor(
  frameTex: THREE.Texture,
  leafTex: THREE.Texture,
): Door {
  const group = new THREE.Group();
  const uniforms = {
    light: { value: 0 },
    iris: { value: -0.4 },
    seam: { value: 0 },
    rays: { value: 0 },
    time: { value: 0 },
    res: { value: new THREE.Vector2(1, 1) },
    cosmos: { value: null as THREE.Texture | null },
  };

  // the doorway: drawn first and without depth, so the leaf can swing into it and stay visible
  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(LEAF.width, LEAF.height),
    new THREE.ShaderMaterial({
      vertexShader: PORTAL_VERT,
      fragmentShader: PORTAL_FRAG,
      uniforms: {
        uCosmos: uniforms.cosmos,
        uRes: uniforms.res,
        uLight: uniforms.light,
        uIris: uniforms.iris,
        uSeam: uniforms.seam,
        uTime: uniforms.time,
      },
      depthWrite: false,
    }),
  );
  // at the far end of the reveal: the light (and the cosmos) is a step beyond the door
  portal.position.set(
    LEAF.hingeX + LEAF.width / 2,
    LEAF_CENTER_Y,
    DOOR.z - JAMB_DEPTH,
  );
  portal.renderOrder = 1;
  group.add(portal);

  // the reveal: the doorway's inner walls, from the face of the frame back to the light
  const jambUniforms = {
    uTint: { value: new THREE.Color(1, 1, 1) },
    uLight: uniforms.light,
  };
  const jamb = new THREE.Mesh(
    jambGeometry(LEAF.width, LEAF.height, JAMB_DEPTH),
    new THREE.ShaderMaterial({
      vertexShader: JAMB_VERT,
      fragmentShader: JAMB_FRAG,
      uniforms: jambUniforms,
      side: THREE.DoubleSide,
    }),
  );
  jamb.position.set(
    LEAF.hingeX + LEAF.width / 2,
    LEAF_CENTER_Y,
    DOOR.z + 0.004,
  );
  group.add(jamb);

  // the leaf: a solid slab with softened edges, the painted face toward us, pink on its edges and back; a
  // hair narrower than the doorway, so a line of light shows at the latch side
  const pink = new THREE.Color("#e2a39f");
  const faceUniforms = {
    uMap: { value: leafTex },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uTurn: { value: 0 },
    uLight: uniforms.light,
  };
  const face = new THREE.ShaderMaterial({
    vertexShader: FACE_VERT,
    fragmentShader: FACE_FRAG,
    uniforms: faceUniforms,
    transparent: true,
  });
  const edge = new THREE.MeshBasicMaterial({ color: pink });
  const back = new THREE.MeshBasicMaterial({
    color: pink.clone().multiplyScalar(0.8),
  });
  const width = LEAF.width * 0.985;
  const slab = new THREE.Mesh(
    new RoundedBoxGeometry(
      width,
      LEAF.height,
      LEAF.thickness,
      3,
      LEAF.thickness * 0.22,
    ),
    [edge, edge, edge, edge, face, back],
  );
  slab.position.set(width / 2, 0, -LEAF.thickness / 2);
  const hinge = new THREE.Group();
  hinge.position.set(LEAF.hingeX, LEAF_CENTER_Y, DOOR.z + 0.002);
  hinge.add(slab);
  slab.renderOrder = 2;
  group.add(hinge);

  // the frame image in front, its doorway transparent
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR.width, DOOR.height),
    new THREE.MeshBasicMaterial({
      map: frameTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  frame.position.set(DOOR.x, DOOR.height / 2, DOOR.z + 0.01);
  frame.renderOrder = 3;
  group.add(frame);

  // the moon is behind the door: its shadow falls toward us, soft and short
  const shadowTex = softShadowTexture();
  const long = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.6),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      color: "#020304",
    }),
  );
  long.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  long.position.set(DOOR.x, 0.012, DOOR.z + 1.1);
  long.renderOrder = 0;
  group.add(long);

  const rays = new THREE.Mesh(
    raysGeometry(LEAF.width, LEAF.height, 9, 2.6),
    new THREE.ShaderMaterial({
      vertexShader: RAYS_VERT,
      fragmentShader: RAYS_FRAG,
      uniforms: { uRays: uniforms.rays, uTime: uniforms.time },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  rays.position.set(LEAF.hingeX + LEAF.width / 2, LEAF_CENTER_Y, DOOR.z + 0.02);
  rays.renderOrder = 4;
  group.add(rays);

  const tinted = new THREE.Color(1, 1, 1);
  const tint = (k: number) => {
    // k: 1 = daylight, lower = dusk (multiplies everything except the light)
    const night = new THREE.Color(
      0.1 + 0.9 * k,
      0.13 + 0.87 * k,
      0.3 + 0.7 * k,
    );
    (frame.material as THREE.MeshBasicMaterial).color.copy(night);
    faceUniforms.uTint.value.copy(night);
    jambUniforms.uTint.value.copy(night);
    tinted.copy(night);
  };
  // the leaf darkens as it turns away from the low sun; its edge catches the light from behind
  const shade = (angle: number) => {
    const night = tinted;
    const turn = Math.sin(angle);
    faceUniforms.uTurn.value = turn;
    edge.color
      .copy(pink)
      .multiply(night)
      .multiplyScalar(1 + 1.6 * turn);
    back.color
      .copy(pink)
      .multiply(night)
      .multiplyScalar(0.55 + 0.9 * turn);
  };
  tint(1);
  shade(0);
  return { group, hinge, frame, tint, shade, uniforms, rays };
}
