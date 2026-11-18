import * as THREE from "three";

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
};

export const initialEntryParams = (): EntryParams => ({ sign: 0, door: 0, push: 0, life: 1 });

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
const MEADOW_SPOT = { u: 1010 / 1671, v: 800 / 941 };
const MEADOW_Z = -14; // the picture stands this far behind the door

export async function createEntryScene(canvas: HTMLCanvasElement, params: EntryParams, backdrop: EntryBackdrop = "clouds") {
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
    picture("/entry/doorframe.webp"),
    picture("/intro/door-leaf.webp"),
    backdrop === "meadow" ? picture("/entry/meadow.webp") : Promise.resolve(null),
  ]);
  const meadow = backdrop === "meadow";
  // everything that makes the door: moved as one onto its spot in the picture (meadow), else at the origin
  const doorGroup = new THREE.Group();
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
  doorGroup.add(frame);

  // ---- the doorway itself: where the canvas turns transparent, showing the site underneath
  const doorwayZ = -0.01;
  const portal = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(OPEN_W, DOOR_H)),
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
  hinge.position.set(-OPEN_W / 2 - DOOR.lap, DOOR_Y, 0.02 + DOOR.t / 2);
  const slab = new THREE.Mesh(keep(new THREE.BoxGeometry(DOOR.w, DOOR.h, DOOR.t)), [edgeMat, edgeMat, edgeMat, edgeMat, leafMat, leafMat]);
  slab.position.set(DOOR.w / 2, DOOR.h / 2, 0);
  slab.renderOrder = 15;
  hinge.add(slab);
  doorGroup.add(hinge);

  // ---- the meadow picture: a plane far behind, covering the view like a photograph (laid out in resize)
  const meadowPlane = meadowTex
    ? new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({ map: meadowTex, depthWrite: false, toneMapped: false })))
    : null;
  if (meadowPlane) {
    meadowPlane.position.z = MEADOW_Z;
    meadowPlane.renderOrder = -10;
    scene.add(meadowPlane);
  }
  // the camera stands back further on narrow screens, so the doorframe still fits
  const startZFor = (aspect: number) => (aspect < 1 ? CAM.z * (1.25 / Math.max(0.45, aspect)) * 0.62 : CAM.z);
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
  };

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
    // the camera: a slow breath while waiting, then straight in through the doorway; it sits on narrow
    // screens further back so the doorframe still fits
    const startZ = startZFor(camera.aspect);
    const dx = doorGroup.position.x + DOORWAY.x;
    const dy = doorGroup.position.y + DOORWAY.y;
    const breathe = (1 - p.push) * p.life;
    // ending just short of the doorway, where the opening overfills the screen (all transparent)
    const endZ = doorwayZ + 0.12;
    const z = startZ + (endZ - startZ) * p.push;
    const k = (z - doorwayZ) / (startZ - doorwayZ);
    camera.position.set(
      dx + (CAM.x - dx) * k + Math.sin(time * 0.23) * 0.12 * breathe,
      dy + (CAM.y - dy) * k + Math.sin(time * 0.31) * 0.06 * breathe,
      z,
    );
    camera.fov = CAM.fov + 8 * p.push * p.push;
    camera.updateProjectionMatrix();
    // always looking straight ahead, so the doorframe stands upright and the push runs dead straight
    camera.lookAt(camera.position.x, camera.position.y, doorwayZ - 10);
    renderer.render(scene, camera);
  };

  return {
    render,
    dispose: () => {
      trash.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
