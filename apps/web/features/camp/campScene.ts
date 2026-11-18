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
 * Character 1, the guitar group (approved 2026-11-18): guitar-group.mp4 is ARPIT's green-screen video,
 * cut out and looped forward then back; the top half is colour and the bottom half its cut-out mask.
 */
const STRENGTH = 1.6; // Soft 0.6, Medium 1, Strong 1.6
const PICTURE = { w: 1670, h: 941 };
const TALL_FOCUS = 0.08; // on tall screens keep the sign in view, like the still (object-position 8%)
// where the guitar group video sits, in picture px, and how its frame is split (colour above, mask below)
const GROUP = { x: 60, y: 600, w: 710, h: 341, colour: 682 / 1376, mask: 688 / 1376 };

const vertex = /* glsl */ `
attribute vec3 position;
uniform vec2 uScale, uOffset;
varying vec2 v;
void main() {
  vec2 s = position.xy * 0.5 + 0.5;
  s.y = 1.0 - s.y; // the picture's rows run downwards
  v = uOffset + s * uScale;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragment = /* glsl */ `
precision highp float;
varying vec2 v;
uniform sampler2D P, B, R, D, GV;
uniform float t, S, off, gvOn;
const vec4 GBOX = vec4(${GROUP.x}.0, ${GROUP.y}.0, ${GROUP.w}.0, ${GROUP.h}.0);
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

void main() {
  vec2 uv = v;
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

  // the guitar group, in front of everything
  vec2 gq = (p - GBOX.xy) / GBOX.zw;
  if (gvOn > 0.5 && gq.x > 0.0 && gq.y > 0.0 && gq.x < 1.0 && gq.y < 1.0) {
    vec3 gc = texture2D(GV, vec2(gq.x, gq.y * ${GROUP.colour})).rgb;
    float ga = texture2D(GV, vec2(gq.x, ${GROUP.mask} + gq.y * ${GROUP.colour})).r;
    col = mix(col, gc, ga);
  }

  gl_FragColor = vec4(col, 1.0);
}`;

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

  // the guitar group plays as a muted looping video
  const video = document.createElement("video");
  video.src = "/camp/guitar-group.mp4";
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";
  const GV = keep(new THREE.VideoTexture(video));
  GV.flipY = false;
  GV.colorSpace = THREE.NoColorSpace;
  GV.generateMipmaps = false;
  GV.minFilter = THREE.LinearFilter;
  const play = () => void video.play().catch(() => {});
  play();
  // some phones refuse to start a video until the page is touched
  window.addEventListener("pointerdown", play, { once: true });

  const u = {
    P: { value: P },
    B: { value: B },
    R: { value: R },
    D: { value: D },
    GV: { value: GV },
    gvOn: { value: 0 },
    t: { value: 0 },
    S: { value: STRENGTH },
    off: { value: 0 },
    uScale: { value: new THREE.Vector2(1, 1) },
    uOffset: { value: new THREE.Vector2(0, 0) },
  };
  const material = keep(
    new THREE.RawShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: u, depthTest: false, depthWrite: false }),
  );
  const quad = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), material);
  quad.frustumCulled = false;
  scene.add(quad);

  let w = 0,
    h = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
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
      u.uScale.value.set(1, f);
      u.uOffset.value.set(0, 0.5 - f / 2);
    } else {
      const f = a / A;
      u.uScale.value.set(f, 1);
      u.uOffset.value.set(TALL_FOCUS * (1 - f), 0);
    }
  };

  const render = (dt: number) => {
    resize();
    const step = Math.min(dt, 0.1);
    u.t.value += step;
    u.off.value = (u.off.value + step * 0.004 * STRENGTH) % 2;
    u.gvOn.value = video.readyState >= 2 ? 1 : 0;
    renderer.render(scene, camera);
  };

  return {
    render,
    dispose: () => {
      window.removeEventListener("pointerdown", play);
      video.pause();
      video.removeAttribute("src");
      video.load();
      trash.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
