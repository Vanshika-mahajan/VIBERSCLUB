import * as THREE from "three";
import { gsap } from "@/lib/motion/gsap";

/**
 * Scene 2, alive: the Vibers World painting drawn by one shader that moves what would move at dusk.
 * The river runs, the campfire and the lantern flicker and throw sparks and smoke, the string lights
 * twinkle and the neon sign hums, clouds and the valley mist drift, leaves, flowers and grass sway,
 * the three Vibers in front breathe, fireflies rise over the meadow and steam curls off the mug.
 *
 * Every place is in the painting's own pixels (1671 x 941), listed in REGIONS below, so new art
 * only needs those numbers moved. The picture covers the screen the way the doorway showed it, so the
 * arrival through the door is seamless, then the view drifts slowly closer.
 */

export type LivingWorld = {
  /** 0..1: how far the slow drift toward the lodge has gone (the timeline can drive it) */
  params: { push: number; lookX: number; lookY: number };
  dispose: () => void;
};

const SIZE = { w: 1671, h: 941 };

/** where things are in the painting, in its pixels (x, y from the top left) */
export const REGIONS = {
  river: { l: 262, t: 565, r: 505, b: 770 },
  fire: { x: 776, y: 548, w: 26, h: 44 },
  lantern: { x: 1016, y: 762 },
  mug: { x: 832, y: 818 },
  lights: { l: 255, t: 290, r: 1240, b: 485 },
  sign: { l: 1235, t: 210, r: 1480, b: 300 },
  sky: { t: 0, b: 105 },
  mist: { l: 440, t: 195, r: 920, b: 300 },
  // the three Vibers in front: their outline box, and where they sit (the breath is anchored there)
  people: [
    { l: 495, t: 535, r: 715, b: 770 },
    { l: 755, t: 570, r: 960, b: 790 },
    { l: 1068, t: 572, r: 1185, b: 712 },
  ],
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// helpers: the painting is addressed in pixels (p, from the top left); the texture in 0..1 (uv)
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uRes;
  uniform float uAspect;
  uniform float uTime;
  uniform float uPush;
  uniform vec2 uLook;
  varying vec2 vUv;
  const vec2 SIZE = vec2(${SIZE.w}.0, ${SIZE.h}.0);

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
  // soft box in pixels
  float box(vec2 p, vec4 b, float soft) {
    return smoothstep(b.x - soft, b.x + soft, p.x) * smoothstep(b.z + soft, b.z - soft, p.x)
         * smoothstep(b.y - soft, b.y + soft, p.y) * smoothstep(b.w + soft, b.w - soft, p.y);
  }
  vec3 tex(vec2 p) { return texture2D(uMap, vec2(p.x / SIZE.x, 1.0 - p.y / SIZE.y)).rgb; }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    // cover the screen, as the doorway did; then drift a little closer, toward the lodge and the fire
    vec2 s = vUv;
    float a = uRes.x / uRes.y;
    vec2 uv = s;
    if (a > uAspect) uv.y = (s.y - 0.5) * (uAspect / a) + 0.5;
    else uv.x = (s.x - 0.5) * (a / uAspect) + 0.5;
    float zoom = 1.0 + 0.06 * uPush;
    vec2 focus = vec2(0.52, 0.48);
    uv = (uv - 0.5) / zoom + 0.5 + (focus - 0.5) * (1.0 - 1.0 / zoom) + uLook * 0.006;
    vec2 p = vec2(uv.x, 1.0 - uv.y) * SIZE;
    float t = uTime;

    // ---- the three Vibers in front breathe: a slow stretch anchored where they sit
    ${REGIONS.people
      .map(
        (b, i) => `{
      vec4 b = vec4(${b.l}.0, ${b.t}.0, ${b.r}.0, ${b.b}.0);
      float m = box(p, b, 14.0);
      float breath = sin(t * ${(1.05 + i * 0.17).toFixed(2)} + ${i * 2}.0) * 0.5 + 0.5;
      p.y += (b.w - p.y) * 0.0045 * breath * m;
    }`,
      )
      .join("\n    ")}

    // ---- wind: leaves at the top and the sides, flowers and grass at the bottom
    // (not the open door at the far left, x < 260, which is wood)
    float leaves = (smoothstep(110.0, 30.0, p.y) + box(p, vec4(285.0, 0.0, 345.0, 380.0), 12.0)
                 + smoothstep(1560.0, 1640.0, p.x)) * smoothstep(272.0, 292.0, p.x);
    float meadow = smoothstep(640.0, 760.0, p.y) * (1.0 - box(p, vec4(400.0, 640.0, 1060.0, 941.0), 30.0) * 0.8);
    float gust = 0.6 + 0.4 * sin(t * 0.37) * sin(t * 0.23 + 1.0);
    vec2 w = vec2(noise(p * 0.02 + vec2(t * 0.4, 0.0)) - 0.5, noise(p * 0.018 + vec2(0.0, t * 0.33) + 9.0) - 0.5);
    p += w * (leaves * 7.0 + meadow * 3.5) * gust;

    // ---- clouds and the valley mist drift
    float sky = smoothstep(${REGIONS.sky.b}.0, ${REGIONS.sky.b - 40}.0, p.y) * smoothstep(380.0, 450.0, p.x) * smoothstep(1250.0, 1180.0, p.x);
    p.x += sky * (noise(vec2(p.y * 0.02, t * 0.05)) - 0.5) * 10.0;
    float mist = box(p, vec4(${REGIONS.mist.l}.0, ${REGIONS.mist.t}.0, ${REGIONS.mist.r}.0, ${REGIONS.mist.b}.0), 30.0);
    p.x += mist * (fbm(vec2(p.x * 0.01 - t * 0.06, p.y * 0.03)) - 0.5) * 14.0;

    // ---- the river runs down to the left: flowing ripples on the white water only
    vec4 rb = vec4(${REGIONS.river.l}.0, ${REGIONS.river.t}.0, ${REGIONS.river.r}.0, ${REGIONS.river.b}.0);
    float river = box(p, rb, 18.0);
    vec3 c0 = tex(p);
    float foam = smoothstep(0.55, 0.85, luma(c0)) * river;
    vec2 flow = vec2(-0.8, 0.35);
    float rip = fbm(p * vec2(0.05, 0.09) - flow * t * 2.2);
    p += (vec2(rip, fbm(p * 0.07 + 5.0 - flow * t * 1.7)) - 0.5) * 7.0 * foam;

    vec3 c = tex(p);
    // glints racing along the water
    float glint = smoothstep(0.72, 0.95, fbm(p * vec2(0.08, 0.16) - flow * t * 3.0));
    c += vec3(1.0, 0.9, 0.8) * glint * foam * 0.22;

    // ---- the campfire: the flames flicker and heave, the glow round it breathes
    vec2 fp = vec2(${REGIONS.fire.x}.0, ${REGIONS.fire.y}.0);
    vec2 fd = (p - fp) / vec2(${REGIONS.fire.w}.0, ${REGIONS.fire.h}.0);
    float flick = 0.75 + 0.25 * noise(vec2(t * 9.0, 0.0)) + 0.15 * sin(t * 23.0);
    float flame = exp(-dot(fd * vec2(1.0, 0.7), fd * vec2(1.0, 0.7)) * 2.2);
    c *= 1.0 + flame * (flick - 0.8) * 1.4;
    float halo = exp(-length((p - fp) / vec2(160.0, 90.0)) * 2.0);
    c += vec3(1.0, 0.5, 0.15) * halo * (flick - 0.75) * 0.35;
    // sparks rising from it
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float life = fract(t * (0.35 + 0.05 * hash(vec2(fi, 1.0))) + hash(vec2(fi, 2.0)));
      vec2 sp = fp + vec2((hash(vec2(fi, 3.0)) - 0.5) * 30.0 + sin(life * 6.0 + fi) * 12.0, -life * 150.0 - 12.0);
      float d = length(p - sp);
      c += vec3(1.0, 0.62, 0.2) * smoothstep(2.6, 0.0, d) * (1.0 - life) * 1.2;
    }
    // a soft column of smoke above it, curling as it rises
    vec2 sm = (p - fp - vec2(0.0, -40.0));
    float rise = clamp(-sm.y / 260.0, 0.0, 1.0);
    float col = exp(-pow((sm.x - sin(sm.y * 0.02 + t * 0.6) * 18.0 * rise) / (14.0 + 50.0 * rise), 2.0));
    float smoke = col * smoothstep(0.0, 0.1, rise) * (1.0 - rise) * fbm(vec2(sm.x * 0.03, sm.y * 0.02 + t * 0.5));
    c = mix(c, vec3(0.62, 0.55, 0.52), smoke * 0.35);

    // ---- the lantern by the mat flickers
    vec2 lp = vec2(${REGIONS.lantern.x}.0, ${REGIONS.lantern.y}.0);
    float lf = 0.85 + 0.15 * noise(vec2(t * 7.0, 4.0));
    c += vec3(1.0, 0.6, 0.25) * exp(-length((p - lp) / vec2(60.0, 50.0)) * 2.4) * (lf - 0.85) * 1.2;

    // ---- string lights and the lodge windows twinkle; the neon sign hums
    float bright = smoothstep(0.62, 0.9, luma(c0)) * smoothstep(0.0, 0.25, c0.r - c0.b);
    vec4 lb = vec4(${REGIONS.lights.l}.0, ${REGIONS.lights.t}.0, ${REGIONS.lights.r}.0, ${REGIONS.lights.b}.0);
    float bulbs = bright * (box(p, lb, 10.0) + box(p, vec4(1180.0, 110.0, 1671.0, 520.0), 10.0) * 0.5);
    float tw = noise(floor(p / 9.0) * 1.7 + vec2(t * 1.6, 0.0));
    c *= 1.0 + bulbs * (tw - 0.5) * 0.5;
    vec4 sb = vec4(${REGIONS.sign.l}.0, ${REGIONS.sign.t}.0, ${REGIONS.sign.r}.0, ${REGIONS.sign.b}.0);
    float hum = 0.96 + 0.04 * sin(t * 50.0) + (step(0.985, noise(vec2(t * 3.0, 7.0))) * -0.25);
    c *= mix(1.0, hum, box(p, sb, 6.0) * bright);

    // ---- steam off the mug
    vec2 mp = vec2(${REGIONS.mug.x}.0, ${REGIONS.mug.y}.0 - 22.0);
    vec2 md = p - mp;
    float up = clamp(-md.y / 70.0, 0.0, 1.0);
    float steam = exp(-pow((md.x - sin(md.y * 0.12 + t * 1.3) * 6.0 * up) / (3.0 + 8.0 * up), 2.0)) * smoothstep(0.0, 0.1, up) * (1.0 - up);
    c += vec3(0.9) * steam * fbm(vec2(md.x * 0.1, md.y * 0.08 + t)) * 0.28;

    // ---- fireflies drifting up over the meadow
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float sp = 0.03 + 0.03 * hash(vec2(fi, 9.0));
      vec2 home = vec2(250.0 + hash(vec2(fi, 5.0)) * 1400.0, 560.0 + hash(vec2(fi, 6.0)) * 360.0);
      vec2 q = home + vec2(sin(t * sp * 7.0 + fi) * 40.0, -fract(t * sp + hash(vec2(fi, 7.0))) * 120.0);
      float blink = smoothstep(0.3, 1.0, sin(t * (1.3 + hash(vec2(fi, 8.0))) + fi * 3.0));
      float d = length(p - q);
      c += vec3(1.0, 0.85, 0.45) * (smoothstep(2.2, 0.0, d) * 1.4 + smoothstep(14.0, 0.0, d) * 0.12) * blink;
    }

    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

export async function createLivingWorld(canvas: HTMLCanvasElement, src: string): Promise<LivingWorld> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const map = await new THREE.TextureLoader().loadAsync(src);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const params = { push: 0, lookX: 0, lookY: 0 };
  const uniforms = {
    uMap: { value: map },
    uRes: { value: new THREE.Vector2(1, 1) },
    uAspect: { value: SIZE.w / SIZE.h },
    uTime: { value: 0 },
    uPush: { value: 0 },
    uLook: { value: new THREE.Vector2() },
  };
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false }),
  );
  scene.add(quad);

  let width = 0,
    height = 0;
  const resize = () => {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    // a painting needs no more than 1.5 device pixels per pixel; it keeps phones cool
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let time = 0;
  const frame = (_t: number, deltaMs: number) => {
    resize();
    time += Math.min(deltaMs, 50) / 1000;
    uniforms.uTime.value = time;
    uniforms.uPush.value = params.push;
    uniforms.uLook.value.set(params.lookX, params.lookY);
    renderer.render(scene, camera);
  };
  gsap.ticker.add(frame);
  frame(0, 16);

  return {
    params,
    dispose: () => {
      gsap.ticker.remove(frame);
      observer.disconnect();
      map.dispose();
      quad.geometry.dispose();
      (quad.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
