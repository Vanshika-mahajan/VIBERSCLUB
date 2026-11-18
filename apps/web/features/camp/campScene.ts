import * as THREE from "three";

/**
 * ARPIT's sunset camp, alive at "Strong" (approved demo, 2026-11-18). The picture is cut into layers
 * (SAM masks, the holes behind them inpainted) so things move as whole objects instead of as a wobble:
 * - the big tree bends around its trunk, the far branches lagging a little, with a slow sway in the leaves;
 * - the prayer flag strings bob and the flags swing below them, more the further they hang;
 * - only the fine detail of the clouds drifts sideways; the sun, its glow and the horizon stay put.
 * Files in public/camp: sunset.webp (the picture), sunset-bg.webp (tree and flags removed),
 * sunset-rig.png (R = place along the string, G = tree, B = flags, A = how far below the string),
 * sunset-sky.webp (RGB = cloud detail + 128, A = where clouds may move).
 *
 * The people (approved 2026-11-18) are ARPIT's green-screen videos, cut out and looped forward then
 * back; in each file the top part is colour and the bottom part its cut-out mask. They sit where
 * ARPIT's reference picture puts them, back to front: hikers, laptop group, man with headphones,
 * yoga woman, guitar group.
 *
 * The paraglider (approved 2026-11-18) is ARPIT's own clip, full screen and untouched apart from the
 * cut-out (sped up 2.4x into the file). It is already gliding when the door opens (ARPIT: "the world
 * doesn't wait"), drifting gently into its path at the clip's own speed; takeOff() then speeds it up
 * until its canopy covers the screen. No Take off button: the camp starts it right after the door.
 *
 * Life (ARPIT: "lively and real", then "tacky" for the drawn birds, rays and dust, now gone): from the
 * moment the door opens the people move, the camera drifts slowly in and the lanterns flicker.
 *
 * One light over everything (ARPIT chose "B, crisp golden hour", made premium): soft shadows where
 * people sit, their edges taking on what is behind them, light haze on the far ones, cool distant
 * ridges, soft highlights, a glow on the sun and the lanterns, a dark frame and fine grain.
 */
const STRENGTH = 1.6; // Soft 0.6, Medium 1, Strong 1.6
const PICTURE = { w: 1670, h: 941 };
const TALL_FOCUS = 0.08; // on tall screens keep the sign in view, like the still (object-position 8%)

/** A cut-out video: its box in picture px, the share of the frame that is colour, and where the mask starts. */
type Clip = { src: string; x: number; y: number; w: number; h: number; colour: number; mask: number; haze: number };
// back to front
const PEOPLE: Clip[] = [
  { src: "/camp/hikers.mp4", x: 1029, y: 651, w: 113, h: 137, colour: 0.489286, mask: 0.5, haze: 0.55 },
  { src: "/camp/laptop-group.mp4", x: 1247, y: 668, w: 225, h: 138, colour: 0.489362, mask: 0.5, haze: 0.35 },
  { src: "/camp/headphones-man.mp4", x: 1353, y: 650, w: 293, h: 222, colour: 0.493333, mask: 0.5, haze: 0.2 },
  { src: "/camp/yoga.mp4", x: 910, y: 716, w: 237, h: 169, colour: 0.491279, mask: 0.5, haze: 0.2 },
  { src: "/camp/guitar-group.mp4", x: 60, y: 600, w: 710, h: 341, colour: 682 / 1376, mask: 688 / 1376, haze: 0 },
];
// the paraglider clip covers the whole picture
// (ARPIT's clip with every frame kept, sped up 2.4x into the file itself and made 960 wide, so it decodes
// easily: playing the big file at 2.4x, the frames could not keep up and the flight froze)
const GLIDER = { src: "/camp/paraglider.mp4", colour: 720 / 1448, mask: 728 / 1448 };
const END_EARLY = 0.03; // in seconds: the last frame, where the canopy covers the whole screen
// ARPIT: "the world doesn't wait". The glider is already flying when the door opens: it glides gently
// (the clip at its own, unhurried speed) while drifting across into its path, then once we are through
// it picks up speed and comes at us
const CRUISE = 0.3; // playback rate while the door opens (gentler than the clip's real speed)
const DRIFT = { x: -150, time: 3.4 }; // picture px it glides in from, and over how long

const vertex = /* glsl */ `
attribute vec3 position;
uniform vec2 uScale, uOffset;
varying vec2 v, sc;
void main() {
  vec2 s = position.xy * 0.5 + 0.5;
  s.y = 1.0 - s.y; // the picture's rows run downwards
  sc = s;
  v = uOffset + s * uScale;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const person = (c: Clip, i: number) => /* glsl */ `
  { vec2 q = (p - vec2(${c.x}.0, ${c.y}.0)) / vec2(${c.w}.0, ${c.h}.0);
    if (vOn > 0.5 && q.x > 0.0 && q.y > 0.0 && q.x < 1.0 && q.y < 1.0) {
      vec3 c = texture2D(V${i}, vec2(q.x, q.y * ${c.colour.toFixed(6)})).rgb;
      float a = texture2D(V${i}, vec2(q.x, ${c.mask.toFixed(6)} + q.y * ${c.colour.toFixed(6)})).r;
      col = mix(col, grade(c, a, col, ${c.haze.toFixed(2)}), a);
    } }`;

const fragment = /* glsl */ `
precision highp float;
varying vec2 v, sc;
uniform sampler2D P, B, R, D, GL;
uniform sampler2D ${PEOPLE.map((_, i) => `V${i}`).join(", ")};
uniform float t, S, off, vOn, glOn, glX, zoom;
const vec2 SZ = vec2(${PICTURE.w}.0, ${PICTURE.h}.0);

// the tree turns a touch around its trunk; branches further out follow a moment later
vec2 canopyD(vec2 p) {
  vec2 r = p - vec2(0.0, 560.0);
  float dist = length(r);
  float lag = dist / 700.0;
  float th = (sin(0.7 * (t - lag)) + 0.4 * sin(1.9 * (t - lag) + 1.3) + 0.25 * sin(0.31 * t)) * 0.0055;
  vec2 rot = vec2(-r.y, r.x) * th;
  vec2 cl = vec2(sin(p.x / 170.0 + t * 1.1) * cos(p.y / 140.0 - t * 0.8),
                 cos(p.x / 150.0 - t * 0.9) * sin(p.y / 160.0 + t * 1.2) * 0.6) * 3.0 * clamp(dist / 700.0, 0.0, 1.2);
  return (rot + cl) * S;
}

// the string bobs most in the middle; each flag swings by how far it hangs below it
vec2 flagD(float s, float hg) {
  float bob = 4.0 * sin(3.14159 * s) * sin(1.3 * t - 4.0 * s);
  return vec2(6.0 * hg * sin(1.7 * t - 5.0 * s + 0.5), bob + 1.5 * hg * sin(2.1 * t - 6.0 * s)) * S;
}

// a person in the camp light: a hint of evening warmth, soft edges that take on what is behind them,
// and light haze on the far ones
vec3 grade(vec3 c, float a, vec3 bg, float haze) {
  c *= vec3(1.03, 0.99, 0.95);
  c = mix(c, bg, smoothstep(0.95, 0.3, a) * 0.3);
  return mix(c, bg * 0.9 + vec3(0.04), haze * 0.18);
}
float blob(vec2 p, vec2 c, vec2 r) { vec2 d = (p - c) / r; return exp(-2.5 * dot(d, d)); }

void main() {
  // a slow drift in toward the camp, as if we were still walking forward
  vec2 uv = vec2(0.5, 0.62) + (v - vec2(0.5, 0.62)) / zoom;
  vec2 p = uv * SZ;
  vec3 col = texture2D(B, uv).rgb;

  // clouds: swap the fine detail here for detail drifted in from the side (mirrored so it never runs out)
  float k = mod(uv.x + off, 2.0);
  vec2 us = vec2(k < 1.0 ? k : 2.0 - k, uv.y);
  vec4 here = texture2D(D, uv);
  col += here.a * (texture2D(D, us).rgb - here.rgb);

  vec2 uc = (p - canopyD(p)) / SZ;
  col = mix(col, texture2D(P, uc).rgb, texture2D(R, uc).g);

  vec4 rg = texture2D(R, uv);
  vec2 uf = (p - flagD(rg.r, rg.a)) / SZ;
  col = mix(col, texture2D(P, uf).rgb, texture2D(R, uf).b);

  // soft contact shadows where people sit, falling toward us, away from the sun
  if (vOn > 0.5) {
    float sh = blob(p, vec2(400.0, 925.0), vec2(330.0, 34.0)) + blob(p, vec2(1035.0, 876.0), vec2(95.0, 16.0))
      + blob(p, vec2(1365.0, 802.0), vec2(110.0, 14.0)) + blob(p, vec2(1520.0, 858.0), vec2(120.0, 18.0))
      + 0.6 * blob(p, vec2(1086.0, 787.0), vec2(45.0, 7.0));
    col *= 1.0 - 0.25 * clamp(sh, 0.0, 1.0);
  }
${PEOPLE.map(person).join("\n")}

  // the paraglider, in front of everything
  { vec2 q = vec2((v.x * SZ.x - glX) / SZ.x, v.y);
    if (glOn > 0.5 && q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) {
      vec3 c = texture2D(GL, vec2(q.x, q.y * ${GLIDER.colour.toFixed(6)})).rgb;
      vec2 mq = vec2(q.x, ${GLIDER.mask.toFixed(6)} + q.y * ${GLIDER.colour.toFixed(6)});
      // the edge pulled in by a couple of pixels, so no dark keyed rim shows round the canopy
      vec2 e = vec2(1.5 / 960.0, 1.5 / 1092.0);
      float a = min(min(texture2D(GL, mq + vec2(e.x, 0.0)).r, texture2D(GL, mq - vec2(e.x, 0.0)).r),
                    min(texture2D(GL, mq + vec2(0.0, e.y)).r, texture2D(GL, mq - vec2(0.0, e.y)).r));
      a = smoothstep(0.1, 0.95, a);
      col = mix(col, grade(c, a, col, 0.12), a);
    } }

  // finish: cool, pale distant ridges, restrained crisp colour (cool shade, warm light), soft highlights,
  // a glow on the sun and the lanterns, deep shadows that keep their detail, a dark frame and fine grain
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  float far = smoothstep(800.0, 470.0, p.y) * smoothstep(300.0, 460.0, p.y);
  col = mix(col, mix(col, vec3(0.62, 0.66, 0.74) * (0.75 + 0.5 * l), 0.55), far * 0.25);
  col = mix(vec3(l), col, 0.9);
  col *= mix(vec3(0.951, 0.9825, 1.035), vec3(1.021, 1.0, 0.965), smoothstep(0.15, 0.75, l));
  col = clamp((col - 0.5) * 1.12 + 0.5, 0.0, 1.0);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.03);
  col += vec3(1.0, 0.72, 0.42) * 0.07 * exp(-length((p - vec2(490.0, 430.0)) / vec2(260.0, 170.0)) * 2.0);
  // the lanterns flicker like real flames
  float fl = 0.8 + 0.12 * sin(t * 9.0) + 0.08 * sin(t * 23.0 + 1.7) + 0.06 * sin(t * 3.1);
  col += vec3(1.0, 0.66, 0.3) * 0.075 * (exp(-length((p - vec2(88.0, 865.0)) / 75.0) * 2.5)
    + exp(-length((p - vec2(1460.0, 750.0)) / 48.0) * 2.5)) * fl;
  vec3 kn = max(col - 0.78, 0.0);
  col = col - kn + kn / (1.0 + kn * 2.5);
  float l2 = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * vec3(0.96, 0.97, 1.02), smoothstep(0.35, 0.05, l2) * 0.6);
  col = mix(col, col * smoothstep(0.0, 0.9, col) * 1.08, 0.18);
  vec2 vq = sc - 0.5;
  col *= 1.0 - 0.34 * dot(vq, vq);
  float gn = fract(sin(dot(floor(p / 1.5) + floor(t * 24.0) * 13.7, vec2(12.9898, 78.233))) * 43758.5453);
  col += (gn - 0.5) * 0.028;

  gl_FragColor = vec4(col, 1.0);
}`;

function videoTexture(video: HTMLVideoElement) {
  const tex = new THREE.VideoTexture(video);
  tex.flipY = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function makeVideo(src: string, loop: boolean) {
  const video = document.createElement("video");
  if (src) video.src = src;
  video.muted = true;
  video.loop = loop;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";
  return video;
}

export async function createCampScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const trash: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T) => (trash.push(d), d);

  const loader = new THREE.TextureLoader();
  const load = async (url: string, data: boolean) => {
    const tex = keep(await loader.loadAsync(url));
    tex.flipY = false;
    tex.colorSpace = THREE.NoColorSpace; // passed straight through, exactly as in the demo
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    if (data) {
      // masks and cloud detail must not be blurred by mipmaps
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
    }
    tex.needsUpdate = true;
    return tex;
  };
  const [P, B, R, D] = await Promise.all([
    load("/camp/sunset.webp", false),
    load("/camp/sunset-bg.webp", false),
    load("/camp/sunset-rig.png", true),
    load("/camp/sunset-sky.webp", true),
  ]);

  // the people play as muted looping videos
  const people = PEOPLE.map((c) => makeVideo(c.src, true));
  const play = () => people.forEach((v) => void v.play().catch(() => {}));
  // they start as the door begins to open (wake), and again on the first touch: some phones refuse to
  // start a video until the page is touched
  let started = false;
  window.addEventListener("pointerdown", play, { once: true });

  // the videos sit in the page, invisible: some browsers stop handing out new frames of a video that
  // is not in the page at all
  const shelf = document.createElement("div");
  shelf.setAttribute("aria-hidden", "true");
  shelf.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none";
  document.body.appendChild(shelf);
  people.forEach((v) => shelf.appendChild(v));

  // the paraglider's clip is fetched whole first, so the flight never waits on the network halfway
  const glider = makeVideo("", false);
  shelf.appendChild(glider);
  let gliderUrl = "";
  void fetch(GLIDER.src)
    .then((r) => r.blob())
    .then((b) => {
      gliderUrl = URL.createObjectURL(b);
      glider.src = gliderUrl;
      glider.load();
    })
    .catch(() => {
      glider.src = GLIDER.src;
    });
  const GL = keep(videoTexture(glider));
  let flying = false; // in the air (from the moment the door opens)
  let rushing = false; // coming at us
  let landed: (() => void) | null = null;
  // the clip may still be loading on a slow connection: wait for it (a few seconds at most)
  const loaded = () =>
    glider.readyState >= 2
      ? Promise.resolve()
      : new Promise<void>((res) => {
          const done = () => (glider.removeEventListener("canplay", done), res());
          glider.addEventListener("canplay", done);
          window.setTimeout(done, 8000);
        });
  const cruise = () => {
    if (flying) return;
    flying = true;
    void loaded().then(() => {
      if (!flying) return;
      if (!rushing) glider.playbackRate = CRUISE;
      void glider.play().catch(() => {});
    });
  };
  /** it picks up speed and comes at us; resolves when its canopy covers the screen */
  const takeOff = async () => {
    if (rushing) return;
    await loaded();
    if (glider.readyState < 2) return;
    cruise();
    rushing = true;
    await new Promise<void>((resolve) => {
      landed = resolve;
      if (glider.paused) void glider.play().catch(() => (landed = null, resolve()));
    });
  };

  const u: Record<string, THREE.IUniform> = {
    P: { value: P },
    B: { value: B },
    R: { value: R },
    D: { value: D },
    GL: { value: GL },
    vOn: { value: 0 },
    glOn: { value: 0 },
    glX: { value: DRIFT.x },
    zoom: { value: 1 },
    t: { value: 0 },
    S: { value: STRENGTH },
    off: { value: 0 },
    uScale: { value: new THREE.Vector2(1, 1) },
    uOffset: { value: new THREE.Vector2(0, 0) },
  };
  people.forEach((v, i) => (u[`V${i}`] = { value: keep(videoTexture(v)) }));
  const material = keep(
    new THREE.RawShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: u, depthTest: false, depthWrite: false }),
  );
  const quad = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), material);
  quad.frustumCulled = false;
  scene.add(quad);

  let w = 0,
    h = 0;
  const resize = (quality: number) => {
    const r = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2) * quality;
    const nw = Math.max(1, Math.round(r.width * ratio));
    const nh = Math.max(1, Math.round(r.height * ratio));
    if (nw === w && nh === h) return;
    w = nw;
    h = nh;
    renderer.setSize(w, h, false);
    // cover the screen exactly as the still picture does
    const a = w / h;
    const A = PICTURE.w / PICTURE.h;
    if (a >= A) {
      const f = A / a;
      (u.uScale.value as THREE.Vector2).set(1, f);
      (u.uOffset.value as THREE.Vector2).set(0, 0.5 - f / 2);
    } else {
      const f = a / A;
      (u.uScale.value as THREE.Vector2).set(f, 1);
      (u.uOffset.value as THREE.Vector2).set(TALL_FOCUS * (1 - f), 0);
    }
  };

  /** the door has begun to open: the people start moving and the camera starts its slow drift in */
  let since = -1;
  const wake = () => {
    if (started) return;
    started = true;
    since = 0;
    play();
    cruise();
  };

  /** quality below 1 draws fewer pixels */
  const render = (dt: number, quality = 1) => {
    resize(quality);
    const step = Math.min(dt, 0.1);
    u.t.value += step;
    if (since >= 0) since += step;
    u.zoom.value = 1.0 + 0.04 * (1 - Math.exp(-Math.max(since, 0) / 3));
    u.off.value = (u.off.value + step * 0.004 * STRENGTH) % 2;
    u.vOn.value = people.every((v) => v.readyState >= 2) ? 1 : 0;
    const ready = glider.readyState >= 2;
    u.glOn.value = ready && flying ? 1 : 0;
    // upload the glider's current frame every time: three's video-frame callback does not reliably fire
    // for this video once it starts playing from a pause, and then the flight froze on its first frame
    if (ready) GL.needsUpdate = true;
    const g = Math.min(Math.max(since, 0) / DRIFT.time, 1);
    u.glX.value = DRIFT.x * (1 - g * g * (3 - 2 * g));
    // speeding up smoothly from the gentle glide to the rush at us
    if (rushing && glider.playbackRate < 1) glider.playbackRate = Math.min(1, glider.playbackRate + step * 1.6);
    // if the door takes longer than usual (a slow device), the glider slows almost to a hover rather
    // than reaching us before we are through
    if (!rushing && flying && glider.currentTime > 1.0 && glider.playbackRate > 0.12) glider.playbackRate = 0.12;
    if (landed && glider.duration && glider.currentTime >= glider.duration - END_EARLY) {
      landed();
      landed = null;
    }
    renderer.render(scene, camera);
  };

  /** the frame on screen now, copied to a plain canvas (for laying over the next page while it loads) */
  const snapshot = () => {
    renderer.render(scene, camera);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(canvas.width / 2));
    c.height = Math.max(1, Math.round(canvas.height / 2));
    c.getContext("2d")?.drawImage(canvas, 0, 0, c.width, c.height);
    return c;
  };

  return {
    render,
    wake,
    takeOff,
    snapshot,
    /** back to the paraglider waiting in the sky */
    reset: () => {
      glider.pause();
      glider.currentTime = 0;
      flying = false;
      rushing = false;
      landed = null;
      since = 0;
    },
    dispose: () => {
      window.removeEventListener("pointerdown", play);
      for (const v of [...people, glider]) {
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
      shelf.remove();
      if (gliderUrl) URL.revokeObjectURL(gliderUrl);
      trash.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
