import * as THREE from "three";
import { addMeadowLife, layerPicture, loadMeadowLayers, MEADOW_STRENGTH, type MeadowLife } from "./scenery";
import { portal as doorway } from "./portal";

/**
 * The entry's 3D scene, after ARPIT's reference, made with ARPIT's own pictures: their doorframe on a
 * little island of grass and stones floats in a sky of clouds at golden hour, closed by their wooden
 * door, with a lit sign over it. On the click the sign lights up, the door swings outward toward us,
 * and through the doorway the site itself shows (the canvas is transparent there, so Home, rendered
 * underneath, is what you see). Then the camera pushes straight in through the doorway into Home.
 *
 * Pictures: public/entry/doorframe.webp (ARPIT's doorframe, its opening transparent) and
 * public/intro/door-leaf.webp (ARPIT's door). The clouds are soft puffs drawn on canvases.
 */

/** Everything the timeline animates, as plain numbers; the scene reads them every frame. */
export type EntryParams = {
  /** 0 dark … 1 the sign fully lit */
  sign: number;
  /** 0 closed … 1 open 90 degrees, swung outward toward us */
  door: number;
  /** 0 standing back … 1 through the doorway */
  push: number;
  /** idle life: clouds drifting, the camera breathing */
  life: number;
  /** 0 … 1 the warm evening light of the camp spilling out through the opening door (meadow) */
  light: number;
};

export const initialEntryParams = (): EntryParams => ({ sign: 0, door: 0, push: 0, life: 1, light: 0 });

// ---- dimensions, in world units (the doorway's floor is at y = 0, the doorframe picture at z = 0)
// The doorframe picture is 1672 x 941; its opening runs x 759-1042, y 141-807 (the path at 807).
const FRAME_PX = { w: 1672, h: 941, open: { l: 759, r: 1042, t: 141, b: 807 } };
const DOOR_H = 2.75;
const PX = DOOR_H / (FRAME_PX.open.b - FRAME_PX.open.t); // world units per picture pixel
const OPEN_W = (FRAME_PX.open.r - FRAME_PX.open.l) * PX;
const OPEN_X = ((FRAME_PX.open.l + FRAME_PX.open.r) / 2) * PX; // the opening centre, in picture units
// the door sits on the face of the frame, lapping a little over the jambs and the head
const DOOR = { w: OPEN_W + 0.09, h: DOOR_H + 0.05, t: 0.07, lap: 0.045 };
const DOOR_Y = 0;
export const DOORWAY = { x: 0, y: DOOR_Y + DOOR_H / 2, z: 0 };
const CAM = { x: 0, y: 1.7, z: 10.5, fov: 38 };

const COL = {
  edge: new THREE.Color("#3a2014"),
  warm: new THREE.Color("#c27a3a"),
  gold: new THREE.Color("#d9a24a"),
  sky: { top: new THREE.Color("#c99872"), mid: new THREE.Color("#ecc9a6"), low: new THREE.Color("#f8eadb") },
};

const rand = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
})();

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, colour = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (colour) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A soft cloud puff: many overlapping round blobs, flatter at the bottom, with ragged edges. */
function cloudTexture(seed: number) {
  return canvasTex(512, 320, (g) => {
    let s = seed * 9301 + 49297;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    g.clearRect(0, 0, 512, 320);
    for (let i = 0; i < 70; i++) {
      // blobs piled up from a flat base: bigger in the middle, smaller toward the edges and top
      const x = 256 + (r() - 0.5) * 380 * (0.6 + r() * 0.4);
      const edge = 1 - Math.abs(x - 256) / 230;
      const y = 250 - r() * 150 * Math.max(0.15, edge);
      const rad = 30 + r() * 70 * Math.max(0.3, edge);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      // red channel: how high in the cloud (lit tops), alpha: density
      const lit = Math.round(255 * Math.min(1, Math.max(0, (280 - y) / 200)));
      grd.addColorStop(0, `rgba(${lit},255,255,0.55)`);
      grd.addColorStop(0.6, `rgba(${lit},255,255,0.35)`);
      grd.addColorStop(1, `rgba(${lit},255,255,0)`);
      g.fillStyle = grd;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    // a flat, soft base
    const base = g.createLinearGradient(0, 230, 0, 300);
    base.addColorStop(0, "rgba(0,0,0,0)");
    base.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = base;
    g.fillRect(0, 230, 512, 90);
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** A soft warm bloom, brightest at the heart. */
function glowTexture() {
  return canvasTex(256, 256, (g) => {
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,214,150,1)");
    grd.addColorStop(0.25, "rgba(255,170,90,0.55)");
    grd.addColorStop(0.6, "rgba(230,120,50,0.16)");
    grd.addColorStop(1, "rgba(200,90,30,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
  });
}

/** The door's thickness and the doorway's sides: walnut end grain running the height, a lighter arris
 * along each corner and darker toward the middle, so the wood reads as a solid block, not a flat card. */
function woodEdgeTexture() {
  return canvasTex(64, 1024, (g) => {
    let sd = 11;
    const r = () => ((sd = (sd * 16807) % 2147483647) - 1) / 2147483646;
    g.fillStyle = "#5a3220";
    g.fillRect(0, 0, 64, 1024);
    // grain: long, slightly wandering streaks
    for (let i = 0; i < 70; i++) {
      const x = r() * 64;
      const dark = r() < 0.6;
      g.strokeStyle = dark ? `rgba(30,14,6,${0.12 + r() * 0.22})` : `rgba(150,92,52,${0.08 + r() * 0.16})`;
      g.lineWidth = 0.6 + r() * 2.2;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y <= 1024; y += 64) g.lineTo(x + Math.sin(y * 0.01 + i) * (1 + r() * 2), y);
      g.stroke();
    }
    // across the thickness: rounded corners catch the light, the middle sits a touch deeper
    const across = g.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, "rgba(255,210,160,0.32)");
    across.addColorStop(0.08, "rgba(255,200,150,0.05)");
    across.addColorStop(0.5, "rgba(0,0,0,0.16)");
    across.addColorStop(0.92, "rgba(255,200,150,0.05)");
    across.addColorStop(1, "rgba(255,210,160,0.32)");
    g.fillStyle = across;
    g.fillRect(0, 0, 64, 1024);
    // and darker toward the foot, out of the sun
    const down = g.createLinearGradient(0, 0, 0, 1024);
    down.addColorStop(0, "rgba(0,0,0,0)");
    down.addColorStop(1, "rgba(0,0,0,0.3)");
    g.fillStyle = down;
    g.fillRect(0, 0, 64, 1024);
  });
}

/** Soft shade for the doorway's inner sides: dark deep inside, lifting toward the opening. */
function jambTexture() {
  return canvasTex(256, 16, (g) => {
    const grd = g.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.72)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 16);
  });
}

/** Soft rays fanning out from the middle, uneven like light through vines. */
function raysTexture() {
  return canvasTex(1024, 1024, (g) => {
    let sd = 5;
    const r = () => ((sd = (sd * 16807) % 2147483647) - 1) / 2147483646;
    g.translate(512, 512);
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2;
      const wd = 0.012 + r() * 0.05;
      const len = 300 + r() * 212;
      const grd = g.createRadialGradient(0, 0, 40, 0, 0, len);
      const k = 0.05 + r() * 0.12;
      grd.addColorStop(0, `rgba(255,200,130,${k})`);
      grd.addColorStop(1, "rgba(255,160,80,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, len, a - wd, a + wd);
      g.closePath();
      g.fill();
    }
    // fade the heart so the doorway itself stays readable
    g.globalCompositeOperation = "destination-out";
    const c = g.createRadialGradient(0, 0, 0, 0, 0, 140);
    c.addColorStop(0, "rgba(0,0,0,0.7)");
    c.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = c;
    g.fillRect(-512, -512, 1024, 1024);
  });
}

/** The sign over the door: the club's name in gold capitals, a fine line under it. */
function signTexture() {
  return canvasTex(1024, 320, (g) => {
    g.clearRect(0, 0, 1024, 320);
    g.fillStyle = "#b8742a";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = '700 150px "Syne Variable", Syne, sans-serif';
    g.fillText("VIBERS", 512, 120);
    g.font = '600 54px "Inter Variable", Inter, sans-serif';
    g.letterSpacing = "18px";
    g.fillText("CLUB · MANALI", 520, 250);
  });
}

const CLOUD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform vec3 uLit;
  uniform vec3 uShade;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    // lit from above and a little from the left by the low sun, warm shade underneath
    float up = clamp(t.r * 0.8 + vUv.y * 0.35 + (0.5 - vUv.x) * 0.15, 0.0, 1.0);
    vec3 c = mix(uShade, uLit, smoothstep(0.1, 0.95, up));
    float a = smoothstep(0.02, 0.6, t.a) * uOpacity;
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uLow;
  varying vec2 vUv;
  void main() {
    vec3 c = mix(uLow, uMid, smoothstep(0.15, 0.5, vUv.y));
    c = mix(c, uTop, smoothstep(0.5, 1.0, vUv.y));
    // the sun low on the left, behind the clouds
    float sun = exp(-pow(length((vUv - vec2(0.28, 0.38)) * vec2(1.6, 1.0)) / 0.22, 2.0));
    c += vec3(1.0, 0.82, 0.6) * sun * 0.25;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Where the door stands. "clouds": floating in a golden sky. "meadow": ARPIT's mountain meadow picture
 * behind it, the door standing on the stone path (MEADOW_SPOT).
 */
export type EntryBackdrop = "clouds" | "meadow";
// the meadow picture is 1671 x 941; the door's foot stands here on the path, as fractions of it
const MEADOW_PX = { w: 1671, h: 941 };
// on the path, tall, as in ARPIT's picture of it (the backpack, camera and skateboard are painted out
// of the meadow picture at ARPIT's ask, so nothing stands near the door)
const MEADOW_SPOT = { u: 1000 / 1671, v: 808 / 941 };
const MEADOW_CAM_Z = 6.4;
const MEADOW_Z = -14; // the picture stands this far behind the door
// ARPIT's panelled wooden door for the meadow, split from their picture into the casing (its opening
// transparent, 772 x 1357) and the door itself (571 x 1226, the opening exactly)
const WOOD_PX = { w: 772, h: 1357, open: { l: 100, r: 671, t: 113, b: 1339 } };
const WOOD_UNIT = DOOR_H / (WOOD_PX.open.b - WOOD_PX.open.t);
// ARPIT's door painted into the meadow picture, wrapped in vines (2026-11-18): the frame, vines, shadow and
// grass are part of the picture; only the door is cut out (door-leaf-painted.webp), to swing open on its
// left edge, and what stands in front of the doorway (door-front.png: grass, daisies, overhanging vines)
// stays in front of it. Pixels of the meadow picture.
const PAINTED = { l: 862, r: 1128, t: 247, b: 801, front: { l: 854, t: 239, r: 1136, b: 807 }, thick: 22, jamb: 70 };

export async function createEntryScene(
  canvas: HTMLCanvasElement,
  params: EntryParams,
  backdrop: EntryBackdrop = "clouds",
  /** the meadow's scenery moving, after Temple Night (scenery.ts) */
  /** sky "blue": the meadow wears the blue camp's sunset sky (camp experiment, 2026-11-20) */
  opts: { alive?: boolean; sky?: "blue" } = {},
) {
  await document.fonts?.ready;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.05, 400);
  const trash: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T) => (trash.push(d), d);
  const loader = new THREE.TextureLoader();
  const picture = async (url: string) => {
    const t = keep(await loader.loadAsync(url));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const [frameTex, leafTex, meadowTex] = await Promise.all([
    // (in the meadow these stay hidden: its door is painted into the picture)
    picture("/entry/doorframe.webp"),
    picture("/intro/door-leaf.webp"),
    backdrop === "meadow" ? picture(`/entry/meadow-door${opts.sky === "blue" ? "-blue" : ""}.webp`) : Promise.resolve(null),
  ]);
  const alive = backdrop === "meadow" && !!opts.alive;
  const layers = alive ? await loadMeadowLayers(loader, keep, opts.sky === "blue" ? "-blue" : "") : null;
  const meadow = backdrop === "meadow";
  // everything that makes the door: moved as one onto its spot in the picture (meadow), else at the origin
  const doorGroup = new THREE.Group();
  const uT = { value: 0 }; // the scenery clock (scenery.ts), shared with the grass at the door
  scene.add(doorGroup);

  // ---- light: a low warm sun from the left, a soft sky fill
  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x8a5a3c, 1.1));
  const sun = new THREE.DirectionalLight(0xffd2a0, 2.4);
  sun.position.set(-6, 7, 8);
  scene.add(sun);

  // ---- sky
  const sky = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(420, 240)),
    keep(
      new THREE.ShaderMaterial({
        vertexShader: CLOUD_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: { uTop: { value: COL.sky.top }, uMid: { value: COL.sky.mid }, uLow: { value: COL.sky.low } },
        depthWrite: false,
        toneMapped: false,
      }),
    ),
  );
  sky.position.set(0, 30, -160);
  sky.renderOrder = -10;
  sky.visible = !meadow;
  scene.add(sky);

  // ---- clouds: far banks, a ring round the arch, and low puffs in front over the steps
  const cloudTex = [0, 1, 2, 3, 4].map((i) => keep(cloudTexture(i + 1)));
  const cloudGeo = keep(new THREE.PlaneGeometry(1, 0.625));
  type Cloud = { mesh: THREE.Mesh; speed: number; x0: number };
  const clouds: Cloud[] = [];
  const addCloud = (x: number, y: number, z: number, size: number, order: number, opacity = 1) => {
    const mat = keep(
      new THREE.ShaderMaterial({
        vertexShader: CLOUD_VERT,
        fragmentShader: CLOUD_FRAG,
        uniforms: {
          uMap: { value: cloudTex[Math.floor(rand() * cloudTex.length)] },
          uOpacity: { value: opacity },
          uLit: { value: new THREE.Color("#fff6ea") },
          uShade: { value: new THREE.Color(z < -40 ? "#d9a98a" : "#c8977a") },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    if (meadow) return;
    const m = new THREE.Mesh(cloudGeo, mat);
    m.scale.set(size * (rand() > 0.5 ? 1 : -1), size, 1);
    m.position.set(x, y, z);
    m.renderOrder = order;
    scene.add(m);
    clouds.push({ mesh: m, speed: (0.02 + rand() * 0.05) * (z < -20 ? 0.5 : 1), x0: x });
  };
  // far away, toward the horizon
  for (let i = 0; i < 26; i++) addCloud(-90 + rand() * 180, -6 + rand() * 30, -60 - rand() * 60, 28 + rand() * 30, 0);
  // middle distance, behind the arch
  for (let i = 0; i < 22; i++) addCloud(-34 + rand() * 68, -3 + rand() * 9, -14 - rand() * 18, 9 + rand() * 9, 1);
  // round the arch's feet, either side
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    addCloud(side * (3.2 + rand() * 7), -1.2 + rand() * 1.8, -1 - rand() * 4, 4 + rand() * 4, 2);
  }
  // low in front, over the bottom of the steps (drawn after the doorway, so they stay in front)
  for (let i = 0; i < 9; i++) addCloud(-10 + rand() * 20, -1.3 + rand() * 0.5, 3 + rand() * 4, 3.5 + rand() * 3, 20, 0.95);

  // ---- ARPIT's doorframe on its island, a flat picture standing upright, its opening over the doorway
  const frame = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(FRAME_PX.w * PX, FRAME_PX.h * PX)),
    keep(new THREE.MeshBasicMaterial({ map: frameTex, transparent: true, depthWrite: false, toneMapped: false })),
  );
  frame.position.set((FRAME_PX.w / 2) * PX - OPEN_X, (FRAME_PX.open.b - FRAME_PX.h / 2) * PX, 0);
  frame.renderOrder = 5;
  if (meadow) {
    // ARPIT's wooden casing: its opening's foot on the ground, over the doorway
    const u = WOOD_UNIT;
    frame.geometry = keep(new THREE.PlaneGeometry(WOOD_PX.w * u, WOOD_PX.h * u));
    frame.position.set((WOOD_PX.w / 2 - (WOOD_PX.open.l + WOOD_PX.open.r) / 2) * u, (WOOD_PX.open.b - WOOD_PX.h / 2) * u, 0);
  }
  // the opening, and the door that fills it: lapping over the jambs (clouds), or fitting it exactly (meadow)
  const openW = meadow ? (WOOD_PX.open.r - WOOD_PX.open.l) * WOOD_UNIT : OPEN_W;
  const leaf = meadow ? { w: openW, h: DOOR_H, lap: 0 } : { w: DOOR.w, h: DOOR.h, lap: DOOR.lap };
  doorGroup.add(frame);

  // ---- the doorway itself: where the canvas turns transparent, showing the site underneath
  const doorwayZ = -0.01;
  const portal = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(openW, DOOR_H)),
    keep(
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        blending: THREE.NoBlending,
        depthWrite: true,
      }),
    ),
  );
  portal.position.set(0, DOOR_Y + DOOR_H / 2, doorwayZ);
  portal.renderOrder = 10;
  doorGroup.add(portal);

  // ---- the sign over the door, standing on the head of the frame
  const signTex = keep(signTexture());
  const signMat = keep(
    new THREE.MeshStandardMaterial({
      map: signTex,
      transparent: true,
      color: COL.gold,
      emissive: new THREE.Color("#ff8a1f"),
      emissiveMap: signTex,
      emissiveIntensity: 0,
      metalness: 0.3,
      roughness: 0.35,
      depthWrite: false,
    }),
  );
  const signW = 2.3;
  const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(signW, signW * (320 / 1024))), signMat);
  const frameTop = (FRAME_PX.open.b - 66) * PX; // the top of the head, in the picture
  sign.position.set(0, frameTop + 0.5, 0.02);
  sign.renderOrder = 12;
  doorGroup.add(sign);
  // its glow in the air round it when lit
  const glowTex = keep(
    canvasTex(256, 256, (g) => {
      // round, soft to nothing well inside the edges (stretched into an oval by the plane)
      const grd = g.createRadialGradient(128, 128, 0, 128, 128, 124);
      grd.addColorStop(0, "rgba(255,190,110,0.85)");
      grd.addColorStop(0.45, "rgba(255,175,90,0.35)");
      grd.addColorStop(1, "rgba(255,170,80,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
    }),
  );
  const glow = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(3.6, 1.8)),
    // normal blending: added light would wash out to white against the pale sky
    keep(new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffa040, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })),
  );
  glow.position.set(0, sign.position.y, sign.position.z - 0.01);
  glow.renderOrder = 11;
  doorGroup.add(glow);
  const signLight = new THREE.PointLight(0xffb060, 0, 6, 1.6);
  signLight.position.set(0, sign.position.y - 0.2, sign.position.z + 0.8);
  doorGroup.add(signLight);
  // ARPIT: no sign over the door in the meadow
  sign.visible = glow.visible = signLight.visible = !meadow;

  // ---- ARPIT's door, hinged on the left (where its hinges are drawn), swinging outward toward us
  const leafMat = keep(new THREE.MeshBasicMaterial({ map: leafTex, toneMapped: false }));
  const edgeMat = keep(new THREE.MeshBasicMaterial({ color: COL.edge, toneMapped: false }));
  const hinge = new THREE.Group();
  hinge.position.set(-openW / 2 - leaf.lap, DOOR_Y, 0.02 + DOOR.t / 2);
  const slab = new THREE.Mesh(keep(new THREE.BoxGeometry(leaf.w, leaf.h, DOOR.t)), [edgeMat, edgeMat, edgeMat, edgeMat, leafMat, leafMat]);
  slab.position.set(leaf.w / 2, leaf.h / 2, 0);
  slab.renderOrder = 15;
  hinge.add(slab);
  doorGroup.add(hinge);
  // in the meadow the door is the one painted into the picture: the 3D frame and door step aside
  if (meadow) frame.visible = hinge.visible = portal.visible = false;
  const painted = new THREE.Group();
  const uOpen = { value: 0 };
  const uLight = { value: 0 };
  // the door's thickness: dark walnut, warming as the doorway's light falls on it
  const edgeTex = keep(woodEdgeTexture());
  edgeTex.colorSpace = THREE.SRGBColorSpace;
  const paintedEdge = keep(new THREE.MeshBasicMaterial({ map: edgeTex, toneMapped: false }));
  const glows: { mesh: THREE.Mesh; peak: number; spin?: number }[] = [];
  const paintedLeafMat = meadow ? keep(new THREE.MeshBasicMaterial({ map: await picture("/entry/door-leaf-painted.webp"), toneMapped: false })) : null;
  if (meadow && paintedLeafMat) {
    const P = PAINTED;
    const w = P.r - P.l,
      h = P.b - P.t;
    // in pixels of the picture, y up, about the picture's middle (laid onto the picture in layoutMeadow)
    const at = (x: number, y: number) => new THREE.Vector3(x - MEADOW_PX.w / 2, MEADOW_PX.h / 2 - y, 0);
    const hole = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(w, h)),
      keep(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, blending: THREE.NoBlending, depthWrite: true })),
    );
    // the opening sits behind the doorway's own depth, so its inner sides show as we near it
    hole.position.copy(at((P.l + P.r) / 2, (P.t + P.b) / 2)).setZ(-P.jamb - 1);
    hole.renderOrder = 10;
    // the doorway's inner sides (left, right and the head): walnut, shading into the dark
    const jambMat = keep(new THREE.MeshBasicMaterial({ map: edgeTex, side: THREE.DoubleSide, toneMapped: false }));
    const shadeMat = keep(new THREE.MeshBasicMaterial({ map: keep(jambTexture()), side: THREE.DoubleSide, transparent: true, depthWrite: false, toneMapped: false }));
    const jambs = new THREE.Group();
    for (const side of ["l", "r", "t"] as const) {
      const long = side === "t" ? w : h;
      const geo = keep(new THREE.PlaneGeometry(P.jamb, long));
      // u runs from the opening (z 0) inward: as laid, only the left side does, so turn the others round
      if (side !== "l") {
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
      }
      for (const mat of [jambMat, shadeMat]) {
        const m = new THREE.Mesh(geo, mat);
        m.renderOrder = mat === jambMat ? 11 : 12;
        if (side === "t") {
          m.rotation.set(Math.PI / 2, 0, Math.PI / 2);
          m.position.copy(at((P.l + P.r) / 2, P.t)).setZ(-P.jamb / 2);
        } else {
          m.rotation.y = side === "l" ? Math.PI / 2 : -Math.PI / 2;
          m.position.copy(at(side === "l" ? P.l : P.r, (P.t + P.b) / 2)).setZ(-P.jamb / 2);
        }
        jambs.add(m);
      }
    }
    const swing = new THREE.Group();
    swing.position.copy(at(P.l, P.b));
    // the face: darker toward the hinge as it turns from the meadow's light, its free edge catching the
    // warm light from the doorway
    paintedLeafMat.onBeforeCompile = (sh) => {
      sh.uniforms.uOpen = uOpen;
      sh.uniforms.uLight = uLight;
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uOpen, uLight;")
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          float u = vMapUv.x;
          diffuseColor.rgb *= mix(1.0, 0.62 + 0.38 * smoothstep(0.0, 0.9, u), uOpen);
          diffuseColor.rgb += vec3(1.0, 0.58, 0.26) * uLight * uOpen * 0.32 * smoothstep(0.82, 1.0, u);
          diffuseColor.rgb += vec3(1.0, 0.7, 0.4) * 0.05 * uOpen * smoothstep(0.35, 0.0, abs(u - uOpen * 0.8 - 0.1));`,
        );
    };
    paintedLeafMat.customProgramCacheKey = () => "painted-leaf";
    const edge = paintedEdge;
    const slabP = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, P.thick)), [edge, edge, edge, edge, paintedLeafMat, paintedLeafMat]);
    slabP.position.set(w / 2, h / 2, -P.thick / 2 + 1);
    slabP.renderOrder = 15;
    swing.add(slabP);
    const F = P.front;
    const front = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(F.r - F.l, F.b - F.t)),
      keep(new THREE.MeshBasicMaterial({ map: await picture("/entry/door-front.png"), transparent: true, depthWrite: false, toneMapped: false })),
    );
    front.position.copy(at((F.l + F.r) / 2, (F.t + F.b) / 2)).setZ(2);
    front.renderOrder = 20;
    painted.add(hole, jambs, swing, front);
    // the camp's evening light spilling out as the door opens: a bloom over the doorway, slow rays
    // fanning out from it and a warm pool on the path in front
    const add = (tex: THREE.Texture, w2: number, h2: number, x: number, y: number, z: number, peak: number, spin?: number) => {
      const m = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(w2, h2)),
        keep(new THREE.MeshBasicMaterial({ map: keep(tex), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })),
      );
      m.position.copy(at(x, y)).setZ(z);
      m.renderOrder = 30;
      m.visible = false;
      painted.add(m);
      glows.push({ mesh: m, peak, spin });
    };
    const cx = (P.l + P.r) / 2,
      cy = (P.t + P.b) / 2;
    add(glowTexture(), 1100, 1250, cx, cy + 40, 4, 0.28);
    add(raysTexture(), 1500, 1500, cx, cy + 60, 4.5, 0.3, 0.018);
    add(glowTexture(), 560, 150, cx + 40, P.b + 6, 3, 0.5);
    painted.userData = { swing, center: at((P.l + P.r) / 2, (P.t + P.b) / 2) };
    scene.add(painted);
  }

  // ---- the meadow picture: a plane far behind, covering the view like a photograph (laid out in resize)
  const meadowPlane = meadowTex
    ? new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({ map: meadowTex, depthWrite: false, toneMapped: false })))
    : null;
  const uOff = { value: 0 };
  const uPush = { value: 0 };
  if (meadowPlane && layers) layerPicture(meadowPlane.material as THREE.MeshBasicMaterial, layers, uT, uOff, uPush);
  if (meadowPlane) {
    meadowPlane.position.z = MEADOW_Z;
    meadowPlane.renderOrder = -10;
    scene.add(meadowPlane);
  }
  // the camera stands back further on narrow screens, so the doorframe still fits
  const camZ = meadow ? MEADOW_CAM_Z : CAM.z;
  const startZFor = (aspect: number) => (aspect < 1 ? camZ * (1.25 / Math.max(0.45, aspect)) * 0.62 : camZ);
  const target = new THREE.Vector3(DOORWAY.x, DOORWAY.y, doorwayZ); // where the camera pushes through
  const layoutMeadow = () => {
    if (!meadowPlane) return;
    const d0 = startZFor(camera.aspect); // camera to the door
    const D = d0 - MEADOW_Z; // camera to the picture
    const vh = 2 * D * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2)) * 1.04; // a little extra for the breathing
    const vw = vh * camera.aspect;
    const img = MEADOW_PX.w / MEADOW_PX.h;
    const W = Math.max(vw, vh * img);
    const H = W / img;
    meadowPlane.scale.set(W, H, 1);
    // slide the picture to bring the door's spot toward the middle, as far as it still covers the view
    const spare = (W - vw) / 2;
    const px = THREE.MathUtils.clamp(-(MEADOW_SPOT.u - 0.5) * W, -spare, spare);
    meadowPlane.position.set(px, CAM.y, MEADOW_Z);
    // the spot on the picture, and where the door must stand so its foot lines up with it from the camera
    const sx = px + (MEADOW_SPOT.u - 0.5) * W;
    const sy = CAM.y + (0.5 - MEADOW_SPOT.v) * H;
    doorGroup.position.set((sx * d0) / D, CAM.y + ((sy - CAM.y) * d0) / D, 0);
    // the painted door lies on the picture itself, and the camera pushes through its doorway there
    painted.position.set(px, CAM.y, MEADOW_Z + 0.001);
    painted.scale.setScalar(W / MEADOW_PX.w);
    painted.updateMatrixWorld(true);
    if (painted.userData.center) target.copy(painted.localToWorld((painted.userData.center as THREE.Vector3).clone()));
  };

  const life: MeadowLife | null = alive
    ? addMeadowLife(scene, camera, uT, keep, { ground: () => doorGroup.position.y, small: Math.min(innerWidth, innerHeight) < 700 })
    : null;

  // ---- sizing
  let w = 1,
    h = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (Math.round(r.width * ratio) === w && Math.round(r.height * ratio) === h) return;
    w = Math.max(1, Math.round(r.width * ratio));
    h = Math.max(1, Math.round(r.height * ratio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.userData.bufferHeight = h;
    layoutMeadow();
  };

  let time = 0;
  const render = (dt: number) => {
    resize();
    const p = params;
    time += dt * (0.3 + 0.7 * p.life);
    // clouds drift slowly to the right, wrapping round
    for (const c of clouds) {
      c.mesh.position.x = c.x0 + ((time * c.speed + 200) % 400) - 200 + 0;
      if (Math.abs(c.mesh.position.z) < 10) c.mesh.position.x = c.x0 + Math.sin(time * c.speed * 3) * 0.4;
    }
    // the sign lights up with a little flicker as it catches
    const flick = p.sign > 0 && p.sign < 1 ? 0.75 + 0.25 * Math.sin(time * 60) : 1;
    signMat.emissiveIntensity = 0.1 + 1.3 * p.sign * flick;
    (glow.material as THREE.MeshBasicMaterial).opacity = 0.3 * p.sign * flick;
    signLight.intensity = 6 * p.sign;
    // the door swings outward on its left-hand hinge, a touch darker as it turns from the light
    hinge.rotation.y = -(Math.PI / 2) * 1.05 * p.door;
    leafMat.color.setScalar(1 - 0.35 * Math.sin(Math.PI * 0.5 * p.door));
    if (paintedLeafMat) {
      (painted.userData.swing as THREE.Group).rotation.y = -(Math.PI / 2) * 1.05 * p.door;
      paintedLeafMat.color.setScalar(1 - 0.3 * Math.sin(Math.PI * 0.5 * p.door));
      uOpen.value = Math.min(1, p.door * 1.4);
      uLight.value = p.light;
      // the wood warms a little as the doorway's light falls on it
      paintedEdge.color.setRGB(1, 1, 1).lerp(COL.warm.clone().multiplyScalar(2.2), 0.2 * p.light);
      // the light breathes a little, like a sunset through moving leaves
      const flicker = 0.92 + 0.05 * Math.sin(time * 2.3) + 0.03 * Math.sin(time * 5.1);
      for (const g of glows) {
        const o = g.peak * p.light * Math.min(1, p.door * 1.6) * flicker * (1 - 0.6 * p.push * p.push);
        g.mesh.visible = o > 0.003;
        (g.mesh.material as THREE.MeshBasicMaterial).opacity = o;
        if (g.spin) g.mesh.rotation.z = Math.sin(time * g.spin * 6) * 0.06;
      }
    }
    uPush.value = p.push;
    // the camera: a slow breath while waiting, then straight in through the doorway; it sits on narrow
    // screens further back so the doorframe still fits
    const startZ = startZFor(camera.aspect);
    const dx = meadow ? target.x : doorGroup.position.x + DOORWAY.x;
    const dy = meadow ? target.y : doorGroup.position.y + DOORWAY.y;
    const dz = meadow ? target.z : doorwayZ;
    const breathe = (1 - p.push) * p.life;
    life?.update(dt, p.push);
    uOff.value = (uOff.value + Math.min(dt, 0.1) * 0.012 * MEADOW_STRENGTH) % 2;
    const look = life?.offset ?? { x: 0, y: 0 };
    // ending just short of the doorway, where the opening overfills the screen (all transparent)
    const endZ = dz + 0.12;
    const z = startZ + (endZ - startZ) * p.push;
    const k = (z - dz) / (startZ - dz);
    camera.position.set(
      dx + (CAM.x - dx) * k + Math.sin(time * 0.23) * 0.12 * breathe + look.x,
      dy + (CAM.y - dy) * k + Math.sin(time * 0.31) * 0.06 * breathe + look.y,
      z,
    );
    camera.fov = CAM.fov + 10 * p.push * p.push;
    camera.updateProjectionMatrix();
    // always looking straight ahead, so the doorframe stands upright and the push runs dead straight
    camera.lookAt(camera.position.x, camera.position.y, dz - 10);
    renderer.render(scene, camera);
    if (meadow) {
      // the open doorway on screen, for the camp behind it (portal.ts)
      camera.updateMatrixWorld();
      painted.updateMatrixWorld(true);
      const P = PAINTED;
      const top = new THREE.Vector3((P.l + P.r) / 2 - MEADOW_PX.w / 2, MEADOW_PX.h / 2 - P.t, 0);
      const bot = new THREE.Vector3((P.l + P.r) / 2 - MEADOW_PX.w / 2, MEADOW_PX.h / 2 - P.b, 0);
      painted.localToWorld(top).project(camera);
      painted.localToWorld(bot).project(camera);
      doorway.rect = { cx: 0.5 + top.x / 2, cy: 0.5 - (top.y + bot.y) / 4, h: (top.y - bot.y) / 2, push: p.push };
    }
  };

  /** Where a spot on the meadow picture (u, v from its top left, 0 to 1) shows at rest, as fractions of the canvas. */
  const anchor = (u: number, v: number) => {
    if (!meadowPlane) return null;
    resize();
    const D = startZFor(camera.aspect) - MEADOW_Z;
    const half = D * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
    const x = meadowPlane.position.x + (u - 0.5) * meadowPlane.scale.x;
    const y = (0.5 - v) * meadowPlane.scale.y;
    return { x: 0.5 + x / (half * camera.aspect) / 2, y: 0.5 - y / half / 2 };
  };

  return {
    render,
    anchor,
    setPointer: (x: number, y: number, on: boolean) => life?.setPointer(x, y, on),
    dispose: () => {
      doorway.rect = null;
      trash.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
