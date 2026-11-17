import * as THREE from "three";

/**
 * The entry's 3D scene, after ARPIT's reference: an arched doorway standing in a sky of clouds at
 * golden hour, a lit sign over a panelled door, steps up to it. On the click the sign lights up, the
 * door swings outward toward us, and through the doorway the site itself shows (the canvas is
 * transparent there, so Home, rendered underneath, is what you see). Then the camera pushes straight
 * in through the doorway into Home.
 *
 * Everything is built here in three.js, no art files: the clouds are soft puffs drawn on canvases,
 * the wall and wood get canvas-drawn grain. Colours follow DESIGN.md (espresso, ivory, amber).
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

// ---- dimensions, in world units (the doorway's floor is at y = 0)
const ARCH = { w: 4.6, h: 6.6, depth: 0.9, border: 0.55 };
const INNER = { w: ARCH.w - ARCH.border * 2, h: ARCH.h - ARCH.border };
const RECESS = -0.45; // the inner wall sits this far back from the arch's face (z = 0)
const DOOR = { w: 1.5, h: 2.75, t: 0.09 };
const DOOR_Y = 0; // the threshold
export const DOORWAY = { x: 0, y: DOOR_Y + DOOR.h / 2, z: RECESS };
const CAM = { x: 0, y: 3.0, z: 14, fov: 38 };

const COL = {
  wall: new THREE.Color("#5a3322"),
  wallRim: new THREE.Color("#6e4029"),
  inner: new THREE.Color("#4a2a1b"),
  wood: new THREE.Color("#3b2216"),
  stone: new THREE.Color("#e9dccb"),
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

/** Fine plaster grain for the arch, wood grain for the door. */
function grainTexture(kind: "plaster" | "wood") {
  return canvasTex(512, 512, (g) => {
    const img = g.createImageData(512, 512);
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 512; x++) {
        const i = (y * 512 + x) * 4;
        let v: number;
        if (kind === "wood") {
          // fine vertical grain with a slow wander
          const n = Math.sin(x * 0.55 + Math.sin(y * 0.008 + x * 0.02) * 2.2) * 0.5 + Math.sin(x * 0.13 + 1.7) * 0.5;
          v = 0.86 + 0.07 * n + 0.05 * (rand() - 0.5);
        } else v = 0.9 + 0.1 * (rand() - 0.5) + 0.04 * Math.sin(x * 0.05 + y * 0.03);
        const c = Math.round(255 * v);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  });
}

/** The sign over the door: the club's name in gold capitals, a fine line under it. */
function signTexture() {
  return canvasTex(1024, 320, (g) => {
    g.clearRect(0, 0, 1024, 320);
    g.fillStyle = "#e6b45a";
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

/** An arch outline: a rectangle with a half-circle on top, its floor at y = 0. */
function archShape(w: number, h: number, shape = new THREE.Shape()) {
  const r = w / 2;
  shape.moveTo(-r, 0);
  shape.lineTo(-r, h - r);
  shape.absarc(0, h - r, r, Math.PI, 0, true);
  shape.lineTo(r, 0);
  shape.lineTo(-r, 0);
  return shape;
}
function archPath(w: number, h: number) {
  const p = new THREE.Path();
  const r = w / 2;
  p.moveTo(-r, 0);
  p.lineTo(r, 0);
  p.lineTo(r, h - r);
  p.absarc(0, h - r, r, 0, Math.PI, false);
  p.lineTo(-r, 0);
  return p;
}

export async function createEntryScene(canvas: HTMLCanvasElement, params: EntryParams) {
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

  // ---- the arch: a thick rounded frame, and the inner wall set back inside it
  const plaster = keep(grainTexture("plaster"));
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping;
  const frameShape = archShape(ARCH.w, ARCH.h);
  frameShape.holes.push(archPath(INNER.w, INNER.h));
  const frameGeo = keep(
    new THREE.ExtrudeGeometry(frameShape, { depth: ARCH.depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 48 }),
  );
  const wallMat = keep(new THREE.MeshStandardMaterial({ color: COL.wall, roughness: 0.85, map: plaster }));
  plaster.repeat.set(0.25, 0.25);
  const frame = new THREE.Mesh(frameGeo, wallMat);
  frame.position.z = -ARCH.depth + 0.05;
  scene.add(frame);
  // the inner wall, with the doorway cut out of it
  const innerShape = archShape(INNER.w + 0.02, INNER.h + 0.01);
  const hole = new THREE.Path();
  const G = 0.015; // the gap round the door
  hole.moveTo(-DOOR.w / 2 - G, DOOR_Y);
  hole.lineTo(DOOR.w / 2 + G, DOOR_Y);
  hole.lineTo(DOOR.w / 2 + G, DOOR_Y + DOOR.h + G);
  hole.lineTo(-DOOR.w / 2 - G, DOOR_Y + DOOR.h + G);
  hole.lineTo(-DOOR.w / 2 - G, DOOR_Y);
  innerShape.holes.push(hole);
  const innerWall = new THREE.Mesh(
    keep(new THREE.ShapeGeometry(innerShape, 48)),
    keep(new THREE.MeshStandardMaterial({ color: COL.inner, roughness: 0.9, map: plaster })),
  );
  innerWall.position.z = RECESS;
  scene.add(innerWall);
  // the reveal of the recess: the arch's inner faces run back to the inner wall (part of the extrude)

  // a moulded casing round the door
  const casingMat = keep(new THREE.MeshStandardMaterial({ color: COL.wallRim, roughness: 0.7 }));
  const casing = new THREE.Group();
  const cw = 0.14;
  const addBar = (w: number, h: number, x: number, y: number) => {
    const b = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, 0.12)), casingMat);
    b.position.set(x, y, RECESS + 0.06);
    casing.add(b);
  };
  addBar(cw, DOOR.h + 0.015 + cw, -DOOR.w / 2 - 0.015 - cw / 2, DOOR_Y + (DOOR.h + 0.015 + cw) / 2);
  addBar(cw, DOOR.h + 0.015 + cw, DOOR.w / 2 + 0.015 + cw / 2, DOOR_Y + (DOOR.h + 0.015 + cw) / 2);
  addBar(DOOR.w + 0.03 + cw * 2, cw, 0, DOOR_Y + DOOR.h + 0.015 + cw / 2);
  scene.add(casing);

  // ---- the doorway itself: where the canvas turns transparent, showing the site underneath
  const doorwayZ = RECESS - 0.02;
  const portal = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(DOOR.w + 0.03, DOOR.h + 0.015)),
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
  portal.position.set(0, DOOR_Y + (DOOR.h + 0.015) / 2, doorwayZ);
  portal.renderOrder = 10;
  scene.add(portal);

  // ---- the sign over the door
  const signTex = keep(signTexture());
  const signMat = keep(
    new THREE.MeshStandardMaterial({
      map: signTex,
      transparent: true,
      color: COL.gold,
      emissive: new THREE.Color("#ffb347"),
      emissiveMap: signTex,
      emissiveIntensity: 0,
      metalness: 0.3,
      roughness: 0.35,
    }),
  );
  const signW = 2.9;
  const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(signW, signW * (320 / 1024))), signMat);
  sign.position.set(0, DOOR_Y + DOOR.h + 1.05, RECESS + 0.02);
  sign.renderOrder = 3;
  scene.add(sign);
  // its glow on the wall when lit
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
    keep(new THREE.PlaneGeometry(4.2, 2.1)),
    keep(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })),
  );
  glow.position.set(0, sign.position.y, sign.position.z + 0.03);
  glow.renderOrder = 4;
  scene.add(glow);
  const signLight = new THREE.PointLight(0xffb060, 0, 6, 1.6);
  signLight.position.set(0, sign.position.y - 0.2, sign.position.z + 0.8);
  scene.add(signLight);

  // ---- the door: panelled wood with a brass knob, hinged on the right, swinging outward
  const woodTex = keep(grainTexture("wood"));
  const woodMat = keep(new THREE.MeshStandardMaterial({ color: COL.wood, roughness: 0.6, map: woodTex }));
  const hinge = new THREE.Group();
  hinge.position.set(DOOR.w / 2, DOOR_Y, RECESS + DOOR.t / 2);
  const leaf = new THREE.Group();
  leaf.position.x = -DOOR.w / 2;
  hinge.add(leaf);
  const slab = new THREE.Mesh(keep(new THREE.BoxGeometry(DOOR.w, DOOR.h, DOOR.t)), woodMat);
  slab.position.y = DOOR.h / 2;
  leaf.add(slab);
  // raised panels on the front: a tall pair and a short pair, as on a classic door
  const panelMat = keep(new THREE.MeshStandardMaterial({ color: COL.wood.clone().multiplyScalar(1.4), roughness: 0.55, map: woodTex }));
  const grooveMat = keep(new THREE.MeshStandardMaterial({ color: "#1c0f09", roughness: 0.8 }));
  const panel = (w: number, h: number, x: number, y: number) => {
    // a dark groove round each raised panel, so it reads at a distance
    const g = new THREE.Mesh(keep(new THREE.BoxGeometry(w + 0.05, h + 0.05, 0.012)), grooveMat);
    g.position.set(x, y, DOOR.t / 2 + 0.006);
    leaf.add(g);
    const p = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, 0.04)), panelMat);
    p.position.set(x, y, DOOR.t / 2 + 0.02);
    leaf.add(p);
  };
  const pw = DOOR.w * 0.34;
  panel(pw, DOOR.h * 0.42, -DOOR.w * 0.21, DOOR.h * 0.68);
  panel(pw, DOOR.h * 0.42, DOOR.w * 0.21, DOOR.h * 0.68);
  panel(pw, DOOR.h * 0.3, -DOOR.w * 0.21, DOOR.h * 0.24);
  panel(pw, DOOR.h * 0.3, DOOR.w * 0.21, DOOR.h * 0.24);
  const brass = keep(new THREE.MeshStandardMaterial({ color: "#c9973f", metalness: 1, roughness: 0.28 }));
  const knob = new THREE.Mesh(keep(new THREE.SphereGeometry(0.07, 24, 16)), brass);
  knob.position.set(-DOOR.w / 2 + 0.16, DOOR.h * 0.47, DOOR.t / 2 + 0.08);
  leaf.add(knob);
  const stem = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 12)), brass);
  stem.rotation.x = Math.PI / 2;
  stem.position.set(knob.position.x, knob.position.y, DOOR.t / 2 + 0.035);
  leaf.add(stem);
  scene.add(hinge);
  // light at the gaps of the closed door, as if the room beyond were lit
  const seamMat = keep(new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const seam = new THREE.Mesh(keep(new THREE.PlaneGeometry(DOOR.w + 0.1, 0.05)), seamMat);
  seam.position.set(0, DOOR_Y + 0.02, RECESS + DOOR.t + 0.01);
  scene.add(seam);

  // ---- steps up to the door, pale stone
  const stoneMat = keep(new THREE.MeshStandardMaterial({ color: COL.stone, roughness: 0.8, map: plaster }));
  for (let i = 0; i < 4; i++) {
    const w = ARCH.w + 0.6 + i * 0.9;
    const step = new THREE.Mesh(keep(new THREE.BoxGeometry(w, 0.22, 0.75)), stoneMat);
    step.position.set(0, -0.11 - i * 0.22, 0.2 + i * 0.75 - 0.4);
    scene.add(step);
  }

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
    signMat.emissiveIntensity = 0.25 + 2.4 * p.sign * flick;
    (glow.material as THREE.MeshBasicMaterial).opacity = 0.55 * p.sign * flick;
    signLight.intensity = 6 * p.sign;
    seamMat.opacity = 0.35 + 0.4 * p.sign;
    // the door swings outward on its right-hand hinge
    hinge.rotation.y = (Math.PI / 2) * p.door;
    // the camera: a slow breath while waiting, then straight in through the doorway; it sits on narrow
    // screens further back so the arch still fits
    const portrait = camera.aspect < 1;
    const startZ = portrait ? CAM.z * (1.25 / Math.max(0.45, camera.aspect)) * 0.62 : CAM.z;
    const breathe = (1 - p.push) * p.life;
    // ending just short of the doorway, where the opening overfills the screen (all transparent)
    const endZ = doorwayZ + 0.35;
    const z = startZ + (endZ - startZ) * p.push;
    const k = (z - doorwayZ) / (startZ - doorwayZ);
    camera.position.set(
      DOORWAY.x + (CAM.x - DOORWAY.x) * k + Math.sin(time * 0.23) * 0.12 * breathe,
      DOORWAY.y + (CAM.y - DOORWAY.y) * k + Math.sin(time * 0.31) * 0.06 * breathe,
      z,
    );
    camera.fov = CAM.fov + 8 * p.push * p.push;
    camera.updateProjectionMatrix();
    // always looking straight ahead, so the arch stands upright and the push runs dead straight
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
