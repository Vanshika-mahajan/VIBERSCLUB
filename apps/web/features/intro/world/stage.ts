import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { gsap } from "@/lib/motion/gsap";
import { makeWoodenDoor } from "./door";
import { makeSceneLife } from "./life";
import {
  AJAR,
  LEAF_OPEN,
  cameraAt,
  DOOR,
  FOV,
  framingFor,
  PACK,
  PLATE,
  SKATEBOARD,
  VINES,
  type Framing,
  type IntroParams,
} from "./params";
import { dotSprite } from "./textures";

/** Scene 1's art. Swap these files to change the scene; see features/intro/README.md. */
export const ART = {
  plate: "/intro/scene1-plate.webp",
  /** the same, with the branch overhead taken out (it sways as its own piece: scene1-branch.webp) */
  plate3d: "/intro/scene1-plate-3d.webp",
  branch: "/intro/scene1-branch.webp",
  pack: "/intro/scene1-pack.webp",
  skateboard: "/intro/scene1-skateboard.webp",
  vines: "/intro/scene1-vines.webp",
  /** how far away each part of Scene 1 is (see DEPTH in README): it gives the painting real depth */
  depth: "/intro/scene1-depth.png",
  /** the painting's own door, unfolded from Scene 1 onto the 3D leaf (see README), with its relief
   * (a normal map) and sheen (roughness) */
  leaf: "/intro/door-painted.webp",
  leafNormal: "/intro/door-painted-normal.webp",
  leafRough: "/intro/door-painted-rough.webp",
  world: "/intro/scene2-world.webp",
  /** the sky behind the painted paraglider, to paint it out when the real one takes off */
  worldPatch: "/intro/scene2-glider-patch.webp",
  paraglider: "/intro/paraglider.webp",
};

/** the camera stands this much closer than the framing while idle (room for its drift); the painted
 * still under the canvas is scaled to match in intro.module.css (.plate) */
const CLOSER = 0.955;

export type DoorStage = {
  params: IntroParams;
  /** the camera framing for the current screen */
  framing: () => Framing;
  dispose: () => void;
};

// The painting, alive: a soft wind moves through it. Gusts roll across from the left; the branch
// overhead sways and its leaves flutter, the vines and flowers round the door tremble, the pines nod,
// the grass and flowers in the meadow ripple (more the nearer they are), and the mist drifts.
// WIND is shared with the cut-outs in front of the door, so the vines over the hinge move with the rest.
const WIND = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float box(vec2 p, vec4 b, float soft) {
    return smoothstep(b.x - soft, b.x + soft, p.x) * smoothstep(b.z + soft, b.z - soft, p.x)
         * smoothstep(b.y - soft, b.y + soft, p.y) * smoothstep(b.w + soft, b.w - soft, p.y);
  }
  // how far the wind moves the painting at uv (0..1 across the painting, 0 at its bottom), in uv
  vec2 windAt(vec2 uv, float t) {
    vec2 q = vec2(uv.x, 1.0 - uv.y); // 0 at the top of the picture
    // a gust rolls across from the left every few seconds, never quite still
    float gust = 0.55 + 0.45 * sin(t * 0.55 - q.x * 4.0) * (0.6 + 0.4 * noise(vec2(t * 0.2, q.x * 2.0)));
    vec2 slow = vec2(noise(uv * vec2(5.0, 3.0) + vec2(t * 0.45, 0.0)), noise(uv * vec2(4.0, 5.0) + vec2(0.0, t * 0.35) + 17.0)) - 0.5;
    vec2 flutter = vec2(noise(uv * 46.0 + vec2(t * 1.6, 0.0)), noise(uv * 46.0 + vec2(0.0, t * 1.4) + 5.0)) - 0.5;
    // where things move
    float branch = smoothstep(0.36, 0.0, q.y) * smoothstep(0.55, 0.08, q.x);
    float trunk = smoothstep(0.17, 0.05, q.x) * smoothstep(0.5, 0.2, q.y);
    // the doorframe (both jambs and the lintel) stays rigid: warping it made its straight edges wavy
    float frame = box(q, vec4(0.48, 0.14, 0.71, 0.86), 0.012);
    float vines = box(q, vec4(0.42, 0.1, 0.76, 0.9), 0.03) * (1.0 - frame);
    float pines = smoothstep(0.73, 0.82, q.x) * smoothstep(0.28, 0.4, q.y) * smoothstep(0.78, 0.66, q.y);
    float forest = smoothstep(0.45, 0.35, q.x) * smoothstep(0.48, 0.58, q.y) * smoothstep(0.8, 0.7, q.y);
    float grass = smoothstep(0.76, 0.84, q.y) * (1.0 - frame);
    float near = smoothstep(0.8, 1.0, q.y);
    vec2 d = vec2(0.0);
    // the branch sways as a whole (more toward its tip) and its leaves flutter
    d += branch * (1.0 - trunk) * (vec2(sin(t * 0.8 + q.x * 2.0), 0.5 * cos(t * 0.65)) * 0.0045 * smoothstep(0.08, 0.45, q.x) + slow * 0.006 + flutter * 0.0022) * gust;
    // the vines outside the frame lean gently with the gusts (no fine flutter, which read as jitter)
    d += vines * (slow * 0.0016 + vec2(0.0009, 0.0) * gust);
    // the pines nod, the far trees in the mist barely
    d += pines * (slow * 0.0026 + vec2(0.0012 * gust, 0.0));
    d += forest * slow * 0.0012;
    // the meadow ripples: grass leans with each gust, flowers bob, most of all close to us
    d += grass * (vec2(slow.x * 1.4 + 0.6 * gust, slow.y * 0.5) * mix(0.0018, 0.0075, near) + flutter * mix(0.0006, 0.0028, near)) * gust;
    return d;
  }
`;
const PLATE_VERT = /* glsl */ `
  uniform sampler2D uDepth;
  uniform vec3 uEye;
  uniform float uDepthOn;
  // the plate reaches a little past the painting (its edge pixels carry on), so a near layer moving
  // aside never opens a gap at the screen's edge
  uniform float uOver;
  varying vec2 vUv;
  // the painting is pushed into depth (DEPTH below): each point slides along the line from the
  // opening camera, so from there the picture looks exactly as painted, and as soon as the camera
  // moves, near things move against far ones as they would in a real place
  float depthAt(vec2 uv) {
    float v = texture2D(uDepth, uv).r * 255.0;
    float n = 1.0 - v / 230.0;
    return v >= 230.0 ? (v - 230.0) / 25.0 * 8.0 : -200.0 * n * n;
  }
  void main() {
    vUv = (uv - 0.5) * uOver + 0.5;
    vec4 w = modelMatrix * vec4(position * vec3(uOver, uOver, 1.0), 1.0);
    if (uDepthOn > 0.0) {
      float z = depthAt(clamp(vUv, 0.0, 1.0)) * uDepthOn;
      w.xyz = uEye + (w.xyz - uEye) * ((uEye.z - z) / uEye.z);
    }
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const PLATE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uWind;
  // which part of the painting this plane shows (x, y, width, height in the painting's 0..1), how
  // strongly, and how softly its edges fade (the painted-door overlay uses all three)
  uniform vec4 uRect;
  uniform float uOpacity;
  uniform float uFeather;
  // red: depth; green: the mountains; blue: the open meadow (tools/depth.py)
  uniform sampler2D uDepth;
  varying vec2 vUv;
  ${WIND}
  void main() {
    vec2 uv = uRect.xy + vUv * uRect.zw;
    vec2 q = vec2(uv.x, 1.0 - uv.y);
    float t = uTime;
    vec3 masks = texture2D(uDepth, clamp(uv, 0.0, 1.0)).rgb;
    // the mist on the left drifts very slowly
    float mist = smoothstep(0.5, 0.3, q.x) * smoothstep(0.3, 0.45, q.y) * smoothstep(0.85, 0.7, q.y);
    uv += windAt(uv, t) * uWind + vec2(sin(t * 0.07) * 0.004, 0.0) * mist * uWind;
    vec3 c = texture2D(uMap, uv).rgb;
    // light crossing the mountains: soft cloud shadows drift over the slopes and the ridges between
    // them catch the low sun, so the range reads as rock in depth rather than a flat picture
    float cloud = noise(uv * vec2(2.6, 4.5) + vec2(t * 0.018, t * 0.004)) * 0.65 + noise(uv * vec2(6.0, 9.0) + vec2(t * 0.03, 0.0)) * 0.35;
    float shade = smoothstep(0.42, 0.72, cloud);
    float mtn = masks.g * uWind;
    c *= 1.0 - 0.22 * shade * mtn;
    c += vec3(1.0, 0.7, 0.45) * 0.05 * (1.0 - shade) * mtn;
    // wind waves rolling through the meadow: the grass bends and shows its paler side in bands
    float wave = sin(dot(q, vec2(9.0, 22.0)) * 3.0 - t * 1.7 + noise(uv * 6.0 + t * 0.1) * 4.0);
    float band = smoothstep(0.35, 1.0, wave) * (0.55 + 0.45 * sin(t * 0.55 - q.x * 4.0));
    c *= 1.0 + 0.09 * band * masks.b * uWind;
    c += vec3(0.05, 0.04, 0.0) * band * masks.b * uWind;
    // the low sun behind the haze on the left breathes very slightly
    float sun = exp(-pow(length((vec2(q.x, 1.0 - q.y) - vec2(0.22, 0.62)) * vec2(1.0, 1.5)) / 0.35, 2.0));
    c += vec3(1.0, 0.72, 0.45) * sun * 0.035 * (0.5 + 0.5 * sin(uTime * 0.4)) * uWind;
    float a = uOpacity;
    if (uFeather > 0.0) a *= box(vUv, vec4(0.0, 0.0, 1.0, 1.0) + vec4(uFeather, uFeather, -uFeather, -uFeather), uFeather);
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }
`;
// The cut-outs in front of the door (backpack, skateboard, the vines over the hinge), moved by the
// same wind as the painting around them.
const CUT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const CUT_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uWind;
  uniform vec4 uRect;
  varying vec2 vUv;
  ${WIND}
  void main() {
    vec2 uv = uRect.xy + vUv * uRect.zw;
    vec2 d = windAt(uv, uTime) * uWind;
    vec4 c = texture2D(uMap, vUv + d / uRect.zw);
    gl_FragColor = c;
    #include <colorspace_fragment>
  }
`;

// Pollen and dust in the low sun: soft dots drifting up and sideways, twinkling.
const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixel;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    float t = uTime * (0.08 + 0.05 * fract(aSeed * 7.0));
    p.x += sin(t * 3.0 + aSeed * 40.0) * 0.4 + t * 0.6;
    p.y += mod(t * 0.9 + aSeed * 9.0, 7.0) - 3.5;
    p.x = mod(p.x + 9.0, 18.0) - 9.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPixel * (6.0 + 10.0 * fract(aSeed * 13.0)) * (6.0 / -mv.z);
    vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.0 + fract(aSeed * 3.0) * 2.0) + aSeed * 30.0));
  }
`;
const DUST_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLife;
  varying float vA;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a * vA * uLife;
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * a * 0.55, a * 0.55);
  }
`;

async function loadTex(loader: THREE.TextureLoader, url: string, colour = true) {
  const t = await loader.loadAsync(url);
  t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * One renderer, one camera and one loop (GSAP's ticker) for Scene 1 and the walk through the door.
 * The canvas is transparent above the painting on phones, where the page's sky shows through.
 */
export async function createDoorStage(
  canvas: HTMLCanvasElement,
  params: IntroParams,
): Promise<DoorStage> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  const loader = new THREE.TextureLoader();
  const [plateTex, packTex, skateTex, worldTex, leafTex, normalTex, roughTex, vinesTex, depthTex, branchTex] = await Promise.all([
    loadTex(loader, ART.plate3d),
    loadTex(loader, ART.pack),
    loadTex(loader, ART.skateboard),
    loadTex(loader, ART.world),
    loadTex(loader, ART.leaf),
    loadTex(loader, ART.leafNormal, false),
    loadTex(loader, ART.leafRough, false),
    loadTex(loader, ART.vines),
    loadTex(loader, ART.depth, false),
    loadTex(loader, ART.branch),
  ]);
  // a softly lit room for the brass to reflect
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();
  pmrem.dispose();

  const scene = new THREE.Scene();
  // far enough for the sky, which the depth map puts 160 units behind the painting
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 600);

  // the painting
  const plateUniforms = {
    uMap: { value: plateTex },
    uTime: { value: 0 },
    uWind: { value: 1 },
    uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uOpacity: { value: 1 },
    uFeather: { value: 0 },
    uDepth: { value: depthTex },
    uEye: { value: new THREE.Vector3(0, 0, 13) },
    uDepthOn: { value: 1 },
    uOver: { value: 1.2 },
  };
  // finely divided, so it can take the shape of the place it shows
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(PLATE.width, PLATE.height, 320, 180),
    new THREE.ShaderMaterial({
      vertexShader: PLATE_VERT,
      fragmentShader: PLATE_FRAG,
      uniforms: plateUniforms,
      // with depth among its own layers (near ones cover far ones), but drawn in a pass of its own
      // before everything else, so the 3D door draws over it, even the leaf swinging in behind it
    }),
  );
  const backdrop = new THREE.Scene();
  backdrop.add(plate);

  // the low sun lights the wood from the left; the sky and the meadow fill the shadows
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x3a2a18, 1.6));
  const sun = new THREE.DirectionalLight(0xffb070, 2.2);
  sun.position.set(-8, 5, 6);
  scene.add(sun);

  // the door, standing in its painted doorway
  const door = makeWoodenDoor({ map: leafTex, normal: normalTex, rough: roughTex, env: envTex });
  door.uniforms.world.value = worldTex;
  door.uniforms.plate.value = plateTex;
  door.group.position.set(DOOR.x, DOOR.y, 0.01);
  scene.add(door.group);

  // Scene 1 shows the door exactly as painted: the painting's door, over the 3D one, dissolves as the
  // camera starts to move (the 3D leaf stands at the same angle underneath, so the change is quiet)
  const OVER = { l: 740, t: 60, r: 1240, b: 840 };
  const overUniforms = {
    uMap: plateUniforms.uMap,
    uTime: plateUniforms.uTime,
    uWind: plateUniforms.uWind,
    uRect: {
      value: new THREE.Vector4(
        OVER.l / 1672,
        1 - OVER.b / 941,
        (OVER.r - OVER.l) / 1672,
        (OVER.b - OVER.t) / 941,
      ),
    },
    uOpacity: { value: 1 },
    uFeather: { value: 0.05 },
    uDepth: plateUniforms.uDepth,
    uEye: plateUniforms.uEye,
    uDepthOn: { value: 0 },
    uOver: { value: 1 },
  };
  const painted = new THREE.Mesh(
    new THREE.PlaneGeometry((OVER.r - OVER.l) / PLATE.px, (OVER.b - OVER.t) / PLATE.px),
    new THREE.ShaderMaterial({
      vertexShader: PLATE_VERT,
      fragmentShader: PLATE_FRAG,
      uniforms: overUniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }),
  );
  painted.position.set(
    ((OVER.l + OVER.r) / 2 - 836) / PLATE.px,
    (470.5 - (OVER.t + OVER.b) / 2) / PLATE.px,
    DOOR.thickness + 0.04,
  );
  painted.renderOrder = 4;
  scene.add(painted);

  // the backpack, the camera, the skateboard and the vines over the hinge stay in front of the door;
  // the vines move in the wind with the rest
  const vinesWind = { value: 1 };
  for (const [tex, at, wind] of [
    [packTex, PACK, { value: 0 }],
    [skateTex, SKATEBOARD, { value: 0 }],
    [vinesTex, VINES, vinesWind],
  ] as const) {
    const rect = new THREE.Vector4(
      (at.x * PLATE.px + 836 - (at.width * PLATE.px) / 2) / 1672,
      1 - (470.5 - at.y * PLATE.px + (at.height * PLATE.px) / 2) / 941,
      (at.width * PLATE.px) / 1672,
      (at.height * PLATE.px) / 941,
    );
    const cut = new THREE.Mesh(
      new THREE.PlaneGeometry(at.width, at.height),
      new THREE.ShaderMaterial({
        vertexShader: CUT_VERT,
        fragmentShader: CUT_FRAG,
        uniforms: { uMap: { value: tex }, uTime: plateUniforms.uTime, uWind: wind, uRect: { value: rect } },
        transparent: true,
        depthWrite: false,
      }),
    );
    cut.position.set(at.x, at.y, DOOR.thickness + 0.06);
    cut.renderOrder = 5;
    scene.add(cut);
  }

  // the branch swaying, mist drifting between the ridges, leaves falling, grass and daisies in front
  const sceneLife = makeSceneLife(branchTex, { uEye: plateUniforms.uEye, uDepthOn: plateUniforms.uDepthOn });
  scene.add(sceneLife.group);

  // pollen in front of everything
  const N = 70;
  const dustPos = new Float32Array(N * 3);
  const dustSeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 18;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 7;
    dustPos[i * 3 + 2] = 1 + Math.random() * 6;
    dustSeed[i] = Math.random();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(dustSeed, 1));
  const dotTex = dotSprite();
  const dustUniforms = {
    uTime: { value: 0 },
    uPixel: { value: 1 },
    uMap: { value: dotTex },
    uLife: { value: 1 },
  };
  const dust = new THREE.Points(
    dustGeo,
    new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: dustUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  dust.renderOrder = 6;
  scene.add(dust);

  let framing = framingFor(1);
  let width = 0,
    height = 0;
  const resize = () => {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    framing = framingFor(w / h);
    const eye = cameraAt(framing, 0, 0);
    plateUniforms.uEye.value.set(eye.x, eye.y, eye.z * CLOSER);
    door.uniforms.res.value.set(Math.round(w * ratio), Math.round(h * ratio));
    dustUniforms.uPixel.value = ratio;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let time = 0;
  const frame = (_t: number, deltaMs: number) => {
    const p = params;
    if (p.rest) return;
    resize();
    time += (Math.min(deltaMs, 50) / 1000) * (0.25 + 0.75 * p.life);
    const life = p.life;
    // the lens widens as we step through, but never past the painting's height (tall phone screens)
    const z = cameraAt(framing, p.focus, p.travel).z;
    const fov = Math.min(FOV + p.warp, (2 * Math.atan(PLATE.height / 2 / z) * 180) / Math.PI);
    const cam = cameraAt(framing, p.focus, p.travel, fov);
    // a little breathing and a little parallax from the pointer, fading out as we walk in
    const still = 1 - Math.min(1, p.focus);
    const breathe = Math.sin(time * 0.5) * 0.03 * life * still;
    // and the camera drifts gently, as if held by someone standing in the meadow: with the painting
    // in depth, the branch, the door and the mountains slide against each other
    // (standing a touch closer than the framing, so the drift never shows past the painting's edges)
    const driftX = (Math.sin(time * 0.21) * 0.14 + Math.sin(time * 0.083) * 0.08) * life * still;
    const driftY = Math.sin(time * 0.17 + 1.3) * 0.06 * life * still;
    camera.position.set(
      cam.x + driftX + p.lookX * 0.15 * still,
      cam.y + breathe + driftY - p.lookY * 0.08 * still,
      cam.z * (1 - (1 - CLOSER) * still),
    );
    camera.lookAt(camera.position.x, camera.position.y, 0);
    camera.fov = fov;
    camera.updateProjectionMatrix();

    door.hinge.rotation.y = LEAF_OPEN * p.leaf;
    door.uniforms.open.value = Math.min(1, Math.max(0, (p.leaf - AJAR) / 0.08));
    door.uniforms.time.value = time;
    door.uniforms.glow.value = p.glow;
    door.uniforms.seam.value = p.seam;
    door.uniforms.flare.value = p.flare;
    door.update();
    plateUniforms.uTime.value = time;
    plateUniforms.uWind.value = life;
    vinesWind.value = life;
    sceneLife.update(time, life, 1 - Math.min(1, p.travel / 0.45));
    overUniforms.uOpacity.value = p.painted;
    painted.visible = p.painted > 0.001;
    dustUniforms.uTime.value = time;
    dustUniforms.uLife.value = life * (1 - p.travel);
    // the depth fades away as we walk through the doorway, where near things would pass the camera
    plateUniforms.uDepthOn.value = 1 - Math.min(1, p.travel / 0.3);
    renderer.clear();
    renderer.render(backdrop, camera);
    renderer.clearDepth();
    renderer.render(scene, camera);
  };
  // development only: the review script can switch layers off to check them
  if (process.env.NODE_ENV !== "production")
    Object.assign(window, { __stage: { scene, backdrop, plateUniforms, overUniforms } });
  gsap.ticker.add(frame);
  frame(0, 16);

  return {
    params,
    framing: () => framing,
    dispose: () => {
      gsap.ticker.remove(frame);
      observer.disconnect();
      door.dispose();
      sceneLife.dispose();
      [plateTex, packTex, skateTex, worldTex, leafTex, normalTex, roughTex, vinesTex, depthTex, branchTex, envTex, dotTex].forEach((t) => t.dispose());
      [scene, backdrop].forEach((sc) => sc.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }));
      renderer.dispose();
    },
  };
}
