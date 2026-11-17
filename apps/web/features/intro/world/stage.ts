import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { gsap } from "@/lib/motion/gsap";
import { makeWoodenDoor } from "./door";
import {
  cameraAt,
  DOOR,
  FOV,
  framingFor,
  PACK,
  PLATE,
  SKATEBOARD,
  type Framing,
  type IntroParams,
} from "./params";
import { dotSprite } from "./textures";

/** Scene 1's art. Swap these files to change the scene; see features/intro/README.md. */
export const ART = {
  plate: "/intro/scene1-plate.webp",
  pack: "/intro/scene1-pack.webp",
  skateboard: "/intro/scene1-skateboard.webp",
  leaf: "/intro/door-leaf.webp",
  /** the panel's relief (a normal map) and sheen (roughness), made from door-leaf.webp */
  leafNormal: "/intro/door-leaf-normal.webp",
  leafRough: "/intro/door-leaf-rough.webp",
  world: "/intro/scene2-world.webp",
};

export type DoorStage = {
  params: IntroParams;
  /** the camera framing for the current screen */
  framing: () => Framing;
  dispose: () => void;
};

// The painting, alive: leaves and grass move in the wind (a small, anchored ripple of the picture
// where there is foliage), and the low sun breathes a little.
const PLATE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
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
  varying vec2 vUv;
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
  void main() {
    vec2 uv = uRect.xy + vUv * uRect.zw;
    vec2 q = vec2(uv.x, 1.0 - uv.y); // 0 at the top of the picture
    // where things move: the branch hanging in at the top left, the vines around the door (not the
    // door itself), the pines on the right, and the flowers and grass along the bottom
    float branch = smoothstep(0.32, 0.0, q.y) * smoothstep(0.62, 0.12, q.x) * smoothstep(0.0, 0.18, q.x);
    float vines = box(q, vec4(0.44, 0.06, 0.73, 0.86), 0.02) * (1.0 - box(q, vec4(0.505, 0.21, 0.665, 0.83), 0.01));
    float pines = smoothstep(0.76, 0.88, q.x) * smoothstep(0.15, 0.3, q.y) * smoothstep(0.75, 0.6, q.y);
    float grass = smoothstep(0.8, 0.95, q.y);
    float t = uTime * uWind;
    vec2 w = vec2(
      noise(uv * vec2(9.0, 6.0) + vec2(t * 0.35, 0.0)) - 0.5,
      noise(uv * vec2(7.0, 9.0) + vec2(0.0, t * 0.3) + 17.0) - 0.5
    );
    vec2 flutter = vec2(noise(uv * 40.0 + vec2(t * 0.9, 0.0)), noise(uv * 40.0 + vec2(0.0, t * 0.8) + 5.0)) - 0.5;
    float gust = 0.6 + 0.4 * sin(t * 0.45);
    uv += w * (branch * 0.0045 * gust + pines * 0.0012 + grass * 0.0028 * gust) * uWind;
    uv += flutter * vines * 0.0016 * uWind;
    vec3 c = texture2D(uMap, uv).rgb;
    // the low sun behind the haze on the left breathes very slightly
    float sun = exp(-pow(length((vec2(q.x, 1.0 - q.y) - vec2(0.22, 0.62)) * vec2(1.0, 1.5)) / 0.35, 2.0));
    c += vec3(1.0, 0.72, 0.45) * sun * 0.035 * (0.5 + 0.5 * sin(uTime * 0.4)) * uWind;
    float a = uOpacity;
    if (uFeather > 0.0) a *= box(vUv, vec4(0.0, 0.0, 1.0, 1.0) + vec4(uFeather, uFeather, -uFeather, -uFeather), uFeather);
    gl_FragColor = vec4(c, a);
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
  const loader = new THREE.TextureLoader();
  const [plateTex, packTex, skateTex, worldTex, leafTex, normalTex, roughTex] = await Promise.all([
    loadTex(loader, ART.plate),
    loadTex(loader, ART.pack),
    loadTex(loader, ART.skateboard),
    loadTex(loader, ART.world),
    loadTex(loader, ART.leaf),
    loadTex(loader, ART.leafNormal, false),
    loadTex(loader, ART.leafRough, false),
  ]);
  // a softly lit room for the brass to reflect
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();
  pmrem.dispose();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);

  // the painting
  const plateUniforms = {
    uMap: { value: plateTex },
    uTime: { value: 0 },
    uWind: { value: 1 },
    uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    uOpacity: { value: 1 },
    uFeather: { value: 0 },
  };
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(PLATE.width, PLATE.height),
    new THREE.ShaderMaterial({
      vertexShader: PLATE_VERT,
      fragmentShader: PLATE_FRAG,
      uniforms: plateUniforms,
      // drawn first, without depth: everything 3D draws over it, even the leaf swinging in behind it
      depthWrite: false,
      depthTest: false,
    }),
  );
  plate.renderOrder = -1;
  scene.add(plate);

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

  // the backpack, the camera and the skateboard stay in front of the door and the vines, as painted
  for (const [tex, at] of [
    [packTex, PACK],
    [skateTex, SKATEBOARD],
  ] as const) {
    const cut = new THREE.Mesh(
      new THREE.PlaneGeometry(at.width, at.height),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    cut.position.set(at.x, at.y, DOOR.thickness + 0.06);
    cut.renderOrder = 5;
    scene.add(cut);
  }

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
    door.uniforms.res.value.set(Math.round(w * ratio), Math.round(h * ratio));
    dustUniforms.uPixel.value = ratio;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const LEAF_OPEN = 1.75; // radians: the leaf swings away from us into the doorway, about 100 degrees
  let time = 0;
  const frame = (_t: number, deltaMs: number) => {
    resize();
    const p = params;
    time += (Math.min(deltaMs, 50) / 1000) * (0.25 + 0.75 * p.life);
    const life = p.life;
    // the lens widens as we step through, but never past the painting's height (tall phone screens)
    const z = cameraAt(framing, p.focus, p.travel).z;
    const fov = Math.min(FOV + p.warp, (2 * Math.atan(PLATE.height / 2 / z) * 180) / Math.PI);
    const cam = cameraAt(framing, p.focus, p.travel, fov);
    // a little breathing and a little parallax from the pointer, fading out as we walk in
    const still = 1 - Math.min(1, p.focus);
    const breathe = Math.sin(time * 0.5) * 0.03 * life * still;
    camera.position.set(
      cam.x + p.lookX * 0.12 * still,
      cam.y + breathe - p.lookY * 0.06 * still,
      cam.z,
    );
    camera.lookAt(camera.position.x, camera.position.y, 0);
    camera.fov = fov;
    camera.updateProjectionMatrix();

    door.hinge.rotation.y = LEAF_OPEN * p.leaf;
    door.uniforms.time.value = time;
    door.uniforms.glow.value = p.glow;
    door.uniforms.seam.value = p.seam;
    door.uniforms.flare.value = p.flare;
    door.update();
    plateUniforms.uTime.value = time;
    plateUniforms.uWind.value = life;
    overUniforms.uOpacity.value = p.painted;
    painted.visible = p.painted > 0.001;
    dustUniforms.uTime.value = time;
    dustUniforms.uLife.value = life * (1 - p.travel);
    renderer.render(scene, camera);
  };
  gsap.ticker.add(frame);
  frame(0, 16);

  return {
    params,
    framing: () => framing,
    dispose: () => {
      gsap.ticker.remove(frame);
      observer.disconnect();
      door.dispose();
      [plateTex, packTex, skateTex, worldTex, leafTex, normalTex, roughTex, envTex, dotTex].forEach((t) => t.dispose());
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    },
  };
}
