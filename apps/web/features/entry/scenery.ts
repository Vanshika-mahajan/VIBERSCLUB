import * as THREE from "three";

/**
 * The meadow coming alive, after the movements of ThreeUI's "Temple Night" scene (ARPIT's reference):
 * its foreground grass sways (sin 0.85 / cos 0.62 per blade, stronger at the tips), haze drifts slowly
 * from side to side, embers rise and waver, leaves fall turning and swaying, wisps of light trail the
 * pointer, and the camera eases after the pointer. Here those same motions are tuned for a sunlit
 * meadow: the grass, flowers and branch in ARPIT's picture sway in the wind (a motion mask,
 * public/entry/meadow-motion.png: red = sways, green = drifts, blue = the branch, swaying in bigger
 * pieces), its clouds and valley mist drift, golden pollen rises instead of embers, and green and gold
 * leaves fall in front of the door. Temple Night's rain, lanterns and bloom are left out: they belong to
 * its night, not to this morning.
 */

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/** Wind in the picture itself: each pixel the motion mask marks is sampled a little to the side. */
export function swayPicture(material: THREE.MeshBasicMaterial, motion: THREE.Texture, uT: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uT = uT;
    shader.uniforms.uMotion = { value: motion };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uT;\nuniform sampler2D uMotion;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        vec4 mm = texture2D(uMotion, vMapUv);
        float sway = mm.r, drift = mm.g, coarse = mm.b;
        // gusts roll across the meadow from the left, so the grass does not all move at once
        float gust = 0.55 + 0.45 * sin(uT * 0.55 - vMapUv.x * 5.0 + sin(uT * 0.23) * 1.5);
        // blades sway on their own (fine phase); the branch sways in whole sprigs (coarse phase)
        float ph = mix(vMapUv.x * 55.0 + vMapUv.y * 31.0, vMapUv.x * 9.0 + vMapUv.y * 4.0, coarse);
        vec2 d = vec2(sin(uT * 0.85 + ph), cos(uT * 0.62 + ph * 1.7) * 0.35) * sway * gust;
        d *= mix(0.0017, 0.0028, coarse);
        d.y *= 1.776; // the picture is wider than tall: the same distance both ways
        // clouds and the valley mist drift slowly from side to side, like Temple Night's haze
        d.x += sin(uT * 0.11 + vMapUv.y * 3.0) * 0.006 * drift;
        vec4 sampledDiffuseColor = texture2D(map, vMapUv + d);
        diffuseColor *= sampledDiffuseColor;`,
      );
  };
  material.customProgramCacheKey = () => "meadow-sway";
  material.needsUpdate = true;
}

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const soft = (inner: string, mid: string) =>
  canvasTex(128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.3, mid);
    grd.addColorStop(0.65, "rgba(255,255,255,0.06)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

/** A leaf like Temple Night's: five pointed lobes from a stem, a few holes nibbled out. */
const leafTexture = () =>
  canvasTex(128, (g) => {
    g.translate(64, 118);
    g.scale(58, -58);
    g.beginPath();
    const lobes = 5;
    const spread = 1.9;
    for (let n = 0; n < lobes; n++) {
      const a = -spread / 2 + spread * (n / (lobes - 1)) + Math.PI / 2;
      const len = n === 2 ? 0.96 : n === 1 || n === 3 ? 0.82 : 0.6;
      const w = 0.17;
      g.moveTo(0, 0.02);
      g.lineTo(Math.cos(a - w) * len * 0.55, Math.sin(a - w) * len * 0.55);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.lineTo(Math.cos(a + w) * len * 0.55, Math.sin(a + w) * len * 0.55);
      g.closePath();
    }
    g.fillStyle = "#fff";
    g.fill();
    g.lineWidth = 0.05;
    g.strokeStyle = "#fff";
    g.stroke();
  });

export type MeadowLife = {
  update(dt: number, push: number): void;
  /** the pointer, -1…1 across and up the canvas; off when it leaves */
  setPointer(x: number, y: number, on: boolean): void;
  /** the camera's offset after the pointer, eased; fades out as the push begins */
  offset: THREE.Vector2;
};

/**
 * The moving things in front of the meadow picture. `ground` is the height of the door's foot,
 * `small` thins everything out for phones.
 */
export function addMeadowLife(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  uT: { value: number },
  keep: <T extends { dispose(): void }>(d: T) => T,
  opts: {
    ground: () => number;
    small: boolean;
    /** the haze veils' height: lowest, and how far above that they may sit */
    hazeY?: [number, number];
    /** the motes' colour, at the heart and further out */
    mote?: [string, string];
  },
): MeadowLife {
  const { small } = opts;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // ---- haze: soft warm veils drifting from side to side behind the door (drawn before the doorway,
  // which clears them where Home shows)
  const hazeTex = keep(soft("rgba(255,244,228,0.9)", "rgba(255,236,214,0.4)"));
  const haze: { mesh: THREE.Mesh; x0: number; sp: number; ph: number }[] = [];
  for (let i = 0; i < (small ? 3 : 5); i++) {
    const w = 7 + rnd() * 8;
    const mesh = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(w, w * 0.4)),
      keep(
        new THREE.MeshBasicMaterial({
          map: hazeTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          opacity: 0.06 + rnd() * 0.07,
        }),
      ),
    );
    const x0 = (rnd() - 0.5) * 16;
    mesh.position.set(x0, (opts.hazeY?.[0] ?? 0.4) + rnd() * (opts.hazeY?.[1] ?? 2.2), -11 + rnd() * 7);
    mesh.renderOrder = -5;
    scene.add(mesh);
    haze.push({ mesh, x0, sp: 0.06 + rnd() * 0.12, ph: rnd() * Math.PI * 2 });
  }

  // ---- pollen: golden motes rising and wavering through the air (Temple Night's embers, by day)
  const motes = small ? 90 : 180;
  const pos = new Float32Array(motes * 3);
  const seeds = new Float32Array(motes);
  for (let i = 0; i < motes; i++) {
    pos[i * 3] = (rnd() - 0.5) * 16;
    pos[i * 3 + 1] = rnd() * 6;
    pos[i * 3 + 2] = -9 + rnd() * 13;
    seeds[i] = rnd();
  }
  const moteGeo = keep(new THREE.BufferGeometry());
  moteGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  moteGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const moteMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uT,
        uGround: { value: 0 },
        uSize: { value: 1 },
        uTex: { value: keep(soft(...(opts.mote ?? ["rgba(255,236,170,1)", "rgba(255,200,110,0.45)"]))) },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uT; uniform float uGround; uniform float uSize; varying float vA;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + uT * (0.10 + aSeed * 0.20), 6.0);
          p.x += sin(uT * 0.36 + aSeed * 22.0) * 0.6;
          p.z += cos(uT * 0.29 + aSeed * 17.0) * 0.5;
          vA = (0.35 + aSeed * 0.65) * smoothstep(6.0, 4.2, p.y) * smoothstep(0.0, 0.8, p.y);
          p.y += uGround;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (0.022 + aSeed * 0.04) / max(-mv.z, 0.6);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex; varying float vA;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(t.rgb, t.a * vA * 0.85);
          #include <colorspace_fragment>
        }`,
    }),
  );
  const pollen = new THREE.Points(moteGeo, moteMat);
  pollen.frustumCulled = false;
  pollen.renderOrder = 18;
  scene.add(pollen);

  // ---- leaves: falling in front of the door, turning and swaying as they go
  const leafCount = small ? 16 : 34;
  const leafMat = keep(
    new THREE.MeshBasicMaterial({ map: keep(leafTexture()), alphaTest: 0.42, side: THREE.DoubleSide, toneMapped: false }),
  );
  const leaves = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.3, 0.3)), leafMat, leafCount);
  leaves.frustumCulled = false;
  leaves.renderOrder = 22;
  const greens = ["#6f8a2e", "#8aa13a", "#b49a2c", "#c98a2a", "#5f7a2a"].map((c) => new THREE.Color(c));
  type Leaf = {
    x: number;
    y: number;
    z: number;
    fall: number;
    drift: number;
    sway: number;
    swayPh: number;
    swayAmp: number;
    spin: number;
    roll: number;
    rollSp: number;
    tilt: number;
    s: number;
  };
  const list: Leaf[] = [];
  const top = 4.6;
  for (let i = 0; i < leafCount; i++) {
    list.push({
      x: -7 + rnd() * 12,
      y: -1 + rnd() * (top + 1),
      z: -5 + rnd() * 8,
      fall: 0.22 + rnd() * 0.4,
      drift: 0.12 + rnd() * 0.25,
      sway: 0.45 + rnd() * 1.5,
      swayPh: rnd() * Math.PI * 2,
      swayAmp: 0.15 + rnd() * 0.45,
      spin: (rnd() - 0.5) * 2.6,
      roll: rnd() * Math.PI * 2,
      rollSp: 0.5 + rnd() * 2,
      tilt: rnd() * Math.PI * 2,
      s: 0.6 + rnd() * 0.8,
    });
    leaves.setColorAt(i, greens[i % greens.length]);
  }
  scene.add(leaves);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();

  // ---- wisps: little lights trailing the pointer, as in Temple Night (carried by the camera)
  const WISP_Z = 3.4;
  const wispN = small ? 70 : 150;
  const wispGeo = keep(new THREE.BufferGeometry());
  const wPos = new Float32Array(wispN * 3);
  const wA = new Float32Array(wispN);
  const wS = new Float32Array(wispN);
  wispGeo.setAttribute("position", new THREE.BufferAttribute(wPos, 3));
  wispGeo.setAttribute("aA", new THREE.BufferAttribute(wA, 1));
  wispGeo.setAttribute("aS", new THREE.BufferAttribute(wS, 1));
  const wispMat = keep(
    new THREE.ShaderMaterial({
      uniforms: { uTex: { value: keep(soft("rgba(255,252,240,1)", "rgba(255,226,170,0.45)")) }, uPx: { value: 1 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `
        attribute float aA; attribute float aS; uniform float uPx; varying float vA;
        void main() {
          vA = aA;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uPx * aS / max(-mv.z, 0.4);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex; varying float vA;
        void main() {
          if (vA <= 0.0) discard;
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(t.rgb, t.a * vA);
          #include <colorspace_fragment>
        }`,
    }),
  );
  const wisps = new THREE.Points(wispGeo, wispMat);
  wisps.frustumCulled = false;
  wisps.renderOrder = 30;
  camera.add(wisps);
  scene.add(camera);
  type Wisp = { life: number; max: number; vx: number; vy: number; sz: number; ph: number };
  const wl: Wisp[] = Array.from({ length: wispN }, () => ({ life: 0, max: 1, vx: 0, vy: 0, sz: 0, ph: 0 }));
  const W = { i: 0, acc: 0, ex: 0, ey: 0, lx: 0, ly: 0, idle: 0, seen: false };

  const P = { tx: 0, ty: 0, on: false, mx: 0, my: 0 };
  const offset = new THREE.Vector2();
  let t = 0;

  const spawn = (x: number, y: number, dir: number, still: boolean) => {
    const k = W.i;
    W.i = (k + 1) % wispN;
    const w = wl[k];
    wPos[k * 3] = x + (Math.random() + Math.random() - 1) * 0.12;
    wPos[k * 3 + 1] = y + (Math.random() + Math.random() - 1) * 0.12;
    wPos[k * 3 + 2] = -WISP_Z + (Math.random() - 0.5) * 0.6;
    w.life = 0;
    w.max = (still ? 2.1 : 1.45) + Math.random() * 1.3;
    w.vx = -Math.cos(dir) * 0.06 + (Math.random() - 0.5) * 0.08;
    w.vy = -Math.sin(dir) * 0.06 + (Math.random() - 0.5) * 0.08;
    w.sz = 0.035 + Math.random() * 0.05;
    w.ph = Math.random() * Math.PI * 2;
  };

  const updateWisps = (dt: number) => {
    const half = Math.tan((camera.fov * Math.PI) / 360) * WISP_Z;
    const px = P.tx * half * camera.aspect;
    const py = P.ty * half;
    if (!W.seen) {
      W.ex = W.lx = px;
      W.ey = W.ly = py;
      W.seen = true;
    }
    W.ex = damp(W.ex, px, 16, dt);
    W.ey = damp(W.ey, py, 16, dt);
    const dx = W.ex - W.lx;
    const dy = W.ey - W.ly;
    const d = Math.hypot(dx, dy);
    const dir = d > 1e-5 ? Math.atan2(dy, dx) : 0;
    if (P.on) {
      W.acc += d;
      let n = 0;
      while (W.acc >= 0.03 && n++ < 14) {
        W.acc -= 0.03;
        const f = d > 1e-6 ? Math.min(1, (n * 0.03) / d) : 0;
        spawn(W.lx + dx * f, W.ly + dy * f, dir, false);
      }
      W.idle += dt;
      if (W.idle > 0.42) {
        W.idle = 0;
        spawn(W.ex, W.ey, Math.random() * Math.PI * 2, true);
      }
    }
    W.lx = W.ex;
    W.ly = W.ey;
    for (let i = 0; i < wispN; i++) {
      const w = wl[i];
      if (w.life >= w.max) {
        wA[i] = 0;
        continue;
      }
      w.life += dt;
      const h = w.life / w.max;
      wPos[i * 3] += (w.vx + Math.sin(t * 1.3 + w.ph) * 0.1) * dt;
      wPos[i * 3 + 1] += (w.vy + Math.cos(t * 1.1 + w.ph * 1.7) * 0.08) * dt;
      w.vx *= 1 - 0.5 * dt;
      w.vy = w.vy * (1 - 0.5 * dt) + 0.014 * dt;
      wA[i] = THREE.MathUtils.smoothstep(h, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(h, 0.22, 1)) * 0.9;
      wS[i] = w.sz * (1 + h * 0.8);
    }
    wispGeo.attributes.position.needsUpdate = true;
    wispGeo.attributes.aA.needsUpdate = true;
    wispGeo.attributes.aS.needsUpdate = true;
  };

  return {
    offset,
    setPointer(x, y, on) {
      P.on = on;
      if (on) {
        P.tx = THREE.MathUtils.clamp(x, -1, 1);
        P.ty = THREE.MathUtils.clamp(y, -1, 1);
      }
    },
    update(dt, push) {
      t += dt;
      uT.value = t;
      const ground = opts.ground();
      const h = bufferHeight(camera);
      moteMat.uniforms.uGround.value = ground;
      moteMat.uniforms.uSize.value = h;
      wispMat.uniforms.uPx.value = h;
      for (const z of haze) z.mesh.position.x = z.x0 + Math.sin(t * z.sp + z.ph) * 3.5;
      // the camera eases after the pointer (Temple Night: 2.6), and settles as the push begins
      P.mx = damp(P.mx, P.on ? P.tx : 0, 2.6, dt);
      P.my = damp(P.my, P.on ? P.ty : 0, 2.6, dt);
      offset.set(P.mx * 0.16, P.my * 0.08).multiplyScalar(1 - Math.min(1, push * 1.5));
      for (let i = 0; i < leafCount; i++) {
        const l = list[i];
        l.y -= l.fall * dt;
        l.x += l.drift * dt;
        l.roll += l.rollSp * dt;
        l.tilt += l.spin * dt;
        if (l.y < ground - 0.6 || l.x > 7) {
          l.y = ground + top + Math.random() * 1.5;
          l.x = -7 + Math.random() * 9;
          l.z = -5 + Math.random() * 8;
        }
        const c = Math.sin(t * l.sway + l.swayPh);
        v.set(l.x + c * l.swayAmp, l.y, l.z + Math.cos(t * l.sway * 0.7 + l.swayPh) * l.swayAmp * 0.6);
        e.set(l.roll, l.tilt, c * 0.55);
        q.setFromEuler(e);
        sc.setScalar(l.s);
        m4.compose(v, q, sc);
        leaves.setMatrixAt(i, m4);
      }
      leaves.instanceMatrix.needsUpdate = true;
      updateWisps(dt);
    },
  };
}

/** The drawing buffer's height in pixels, which point sizes scale with (stored on the camera by the scene). */
function bufferHeight(camera: THREE.PerspectiveCamera) {
  return (camera.userData.bufferHeight as number | undefined) ?? 800;
}
