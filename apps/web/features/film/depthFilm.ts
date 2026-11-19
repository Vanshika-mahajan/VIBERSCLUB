import * as THREE from "three";

/**
 * ARPIT's entry film with real depth (ARPIT: "use three.js", "I want depth in it", not a world you walk in).
 *
 * The video holds the film on top (1920 x 1080) and, under it, how far away each pixel is (960 x 540,
 * near = white), measured frame by frame. Here the film is laid on a 3D surface shaped by that depth:
 * near things stand forward, far things sit back. From the resting camera it looks exactly like the
 * film, because every point is scaled back to where it would land on screen; as the camera eases with the
 * pointer (or drifts on its own on phones), the door frame, the people and the paraglider slide against
 * the valley behind them like a view through a window. Pollen and dust float in real depth between the
 * layers, hidden behind whatever is nearer.
 */

export const FILM = {
  src: "/film/entry-depth.mp4",
  /** phones and small screens: 1280 wide, lighter */
  small: "/film/entry-depth-small.mp4",
  /** the first frame, shown until the film is ready and as the still without 3D */
  first: "/film/entry-first.webp",
  w: 1920,
  h: 1080,
  depthH: 540, // the depth strip under the film, at half size, in the left half
};

const DEPTH = 3.0; // how far the nearest things stand forward of the farthest, in scene units
const DIST = 12; // camera distance from the far plane
const LOOK = { x: 0.8, y: 0.4 }; // how far the camera can ease with the pointer
const OVERSCAN = 1.1; // a little bigger than the screen, so the edges never show as the camera moves
const DOOR_X = 0.58; // where the door stands across the film, 0..1

const VERT = /* glsl */ `
uniform sampler2D map;
uniform float depthAmt, dist;
varying vec2 vUv;
varying float vD;
const float TOP = ${(FILM.depthH / (FILM.h + FILM.depthH)).toFixed(6)};
void main() {
  vUv = uv;
  // the depth strip: left half, bottom part of the video (VideoTexture is flipped, so v = 0 is the bottom)
  float d = texture2D(map, vec2(uv.x * 0.5, uv.y * TOP)).r;
  vD = d;
  float z = d * depthAmt;
  // scale toward the centre so from the resting camera everything lands where the film has it
  vec3 p = vec3(position.xy * (dist - z) / dist, z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float t;
varying vec2 vUv;
varying float vD;
const float TOP = ${(FILM.depthH / (FILM.h + FILM.depthH)).toFixed(6)};
void main() {
  vec3 c = texture2D(map, vec2(vUv.x, TOP + vUv.y * (1.0 - TOP))).rgb;
  // a breath of warm evening air on the far valley only, so distance reads without washing anything out
  float far = (1.0 - vD) * (1.0 - vD);
  c = mix(c, vec3(0.95, 0.82, 0.68), far * 0.05);
  // gentle contrast and richness
  c = clamp((c - 0.5) * 1.06 + 0.5, 0.0, 1.0);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.05);
  vec2 q = vUv - 0.5;
  c *= 1.0 - 0.22 * dot(q, q) * 2.0;
  float g = fract(sin(dot(floor(gl_FragCoord.xy / 1.5) + floor(t * 24.0) * 7.3, vec2(12.9898, 78.233))) * 43758.5453);
  c += (g - 0.5) * 0.018;
  gl_FragColor = vec4(c, 1.0);
}`;

const DUST_VERT = /* glsl */ `
uniform float t, px;
attribute float seed;
varying float vA;
void main() {
  vec3 p = position;
  // drifting slowly up and across on the evening air, wrapping round so it never runs out
  p.x = mod(p.x + t * 0.06 + sin(t * 0.21 + seed * 6.28) * 0.35 + 9.0, 18.0) - 9.0;
  p.y = mod(p.y + t * (0.05 + seed * 0.07) + 4.5, 9.0) - 4.5 + sin(t * 0.37 + seed * 11.0) * 0.18;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = mix(1.5, 4.5, seed);
  gl_PointSize = size * px * (8.0 / -mv.z);
  vA = (0.25 + 0.5 * seed) * (0.6 + 0.4 * sin(t * 1.3 + seed * 20.0));
}`;

const DUST_FRAG = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * a * vA, 1.0);
}`;

export type DepthFilm = {
  video: HTMLVideoElement;
  play(): Promise<void>;
  render(time: number): void;
  resize(): void;
  pointer(x: number, y: number): void;
  /** dev review: jump the camera straight to where the pointer asks, no easing */
  snap(): void;
  /** the frame on screen now, as a picture (for the hand-over to Home) */
  snapshot(): HTMLImageElement;
  dispose(): void;
};

export function createDepthFilm(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): DepthFilm {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  const uniforms = {
    map: { value: tex },
    depthAmt: { value: DEPTH },
    dist: { value: DIST },
    t: { value: 0 },
  };
  const film = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 9, 384, 216),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
    }),
  );
  scene.add(film);

  // pollen and dust in real depth, from just behind the near things to right in front of the lens
  const N = 520;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 2] = 0.6 + Math.random() * (DIST - 4);
    seed[i] = Math.random();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const dustU = { t: { value: 0 }, px: { value: 1 } };
  const dust = new THREE.Points(
    dustGeo,
    new THREE.ShaderMaterial({
      uniforms: dustU,
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(dust);

  const aim = { x: 0, y: 0 };
  const cam = { x: 0, y: 0 };
  let last = 0;
  let frozen = false;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // cover the screen: the far plane fills the view on its tighter side, plus overscan
    const viewH = 2 * DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const s = Math.max(viewH / 9, (viewH * camera.aspect) / 16) * OVERSCAN;
    film.scale.set(s, s, 1);
    dust.scale.set(s, s, 1);
    // on tall screens only a slice of the film fits: keep the door (a little right of centre) in the middle
    const spare = Math.max(0, (16 * s - viewH * camera.aspect) / 2);
    film.position.x = -Math.min(spare, (DOOR_X - 0.5) * 16 * s);
    dustU.px.value = renderer.getPixelRatio() * (h / 900);
    camera.updateProjectionMatrix();
  };
  resize();

  return {
    video,
    play: () => video.play(),
    snapshot() {
      // read the canvas straight after drawing, before the browser clears it
      renderer.render(scene, camera);
      const img = new Image();
      img.src = canvas.toDataURL("image/jpeg", 0.9);
      return img;
    },
    snap() {
      cam.x = aim.x * LOOK.x;
      cam.y = aim.y * LOOK.y;
      frozen = true;
    },
    pointer(x, y) {
      aim.x = x;
      aim.y = y;
    },
    resize,
    render(time) {
      const s = time / 1000;
      const dt = Math.min(0.05, s - last || 0.016);
      last = s;
      // without a pointer (phones) the camera breathes on its own, slowly
      const idle = {
        x: Math.sin(s * 0.23) * 0.35,
        y: Math.sin(s * 0.17 + 1.1) * 0.3,
      };
      const tx = (aim.x || idle.x) * LOOK.x;
      const ty = (aim.y || idle.y) * LOOK.y;
      if (!frozen) {
        cam.x += (tx - cam.x) * Math.min(1, dt * 2.2);
        cam.y += (ty - cam.y) * Math.min(1, dt * 2.2);
      }
      camera.position.set(cam.x * film.scale.x, cam.y * film.scale.x, DIST);
      camera.lookAt(0, 0, 0);
      // VideoTexture waits for a new video frame callback, which some browsers skip after a seek or
      // while decoding is busy; asking every frame keeps the picture moving
      if (video.readyState >= 2) tex.needsUpdate = true;
      uniforms.t.value = s;
      dustU.t.value = s;
      renderer.render(scene, camera);
    },
    dispose() {
      film.geometry.dispose();
      (film.material as THREE.Material).dispose();
      dustGeo.dispose();
      (dust.material as THREE.Material).dispose();
      tex.dispose();
      renderer.dispose();
    },
  };
}
