import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { gsap } from "@/lib/motion/gsap";
import { makeCosmos } from "./cosmos";
import { makeDoor } from "./door";
import { makeForeground } from "./foreground";
import { DOOR, PHOTO_ASPECT, PHOTO_FOV } from "./layout";
import { makeMeadow } from "./meadow";
import { cameraAt, initialParams, type WorldParams } from "./params";

export type World = {
  params: WorldParams;
  /** true once the camera has passed through the doorway */
  inCosmos: () => boolean;
  /** review tooling: stop the loop and draw one frame at a time */
  manual: (on: boolean) => void;
  step: (deltaMs: number) => void;
  dispose: () => void;
};

const DEG = Math.PI / 180;
const PHOTO_HALF_W = Math.tan((PHOTO_FOV / 2) * DEG) * PHOTO_ASPECT;

/** The lens for this screen: crop the photo's sides on narrow screens, its top and bottom on wide ones. */
function baseFov(aspect: number) {
  if (aspect >= PHOTO_ASPECT)
    return (2 * Math.atan(PHOTO_HALF_W / aspect)) / DEG;
  // tall phones: a slightly wider lens, so the door has sky above it and grass below
  return aspect < 0.7 ? PHOTO_FOV * 1.22 : PHOTO_FOV;
}

async function load(
  url: string,
  loader: THREE.TextureLoader,
  maxAniso: number,
) {
  const t = await loader.loadAsync(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

/**
 * One renderer and one loop (GSAP's ticker) for the whole journey. The meadow scene renders through
 * bloom; while the door is open, the cosmos renders first into a texture the doorway shows. When the
 * camera crosses the doorway, the cosmos is rendered directly and the meadow is dropped.
 */
export async function createWorld(canvas: HTMLCanvasElement): Promise<World> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();
  const [photo, frameTex, leafTex, grassTex] = await Promise.all([
    load("/journey/meadow.webp", loader, maxAniso),
    load("/journey/door-frame.webp", loader, maxAniso),
    load("/journey/door-leaf.webp", loader, maxAniso),
    load("/journey/grass.webp", loader, maxAniso),
  ]);

  const params = initialParams();
  const camera = new THREE.PerspectiveCamera(PHOTO_FOV, 1, 0.05, 3000);
  camera.rotation.order = "YXZ";

  const meadowScene = new THREE.Scene();
  const meadow = makeMeadow(photo);
  const door = makeDoor(frameTex, leafTex);
  const fore = makeForeground(grassTex);
  meadowScene.add(meadow.group, door.group, fore.group);
  const cosmos = makeCosmos();

  const cosmosTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
  });
  door.uniforms.cosmos.value = cosmosTarget.texture;

  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }),
  );
  const renderPass = new RenderPass(meadowScene, camera);
  // only light brighter than the photo's whites blooms: the doorway, the shafts, the brightest stars
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 1.0);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let width = 0;
  let height = 0;
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    cosmosTarget.setSize(Math.round(w * ratio), Math.round(h * ratio));
    door.uniforms.res.value.set(Math.round(w * ratio), Math.round(h * ratio));
    cosmos.uniforms.pixel.value = ratio;
    fore.uniforms.pixel.value = ratio;
    camera.aspect = w / h;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let crossed = false;
  let elapsed = 0;
  let manual = false;
  const tick = (_time: number, deltaMs: number) => {
    if (!manual) frame(deltaMs);
  };
  const frame = (deltaMs: number) => {
    if (document.hidden) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    elapsed += dt;
    const p = params;

    // camera: the flight, plus a little breathing and the mouse
    const c = cameraAt(p.travel);
    const still = 1 - Math.min(p.travel * 4, 1);
    camera.position.set(
      c.x + p.lookX * 0.22 * still + Math.sin(elapsed * 0.31) * 0.02 * p.life,
      c.y - p.lookY * 0.1 * still + Math.sin(elapsed * 0.53) * 0.012 * p.life,
      c.z,
    );
    camera.rotation.set(
      c.pitch + p.lookY * 0.008 * still,
      -p.lookX * 0.012 * still,
      Math.sin(elapsed * 0.23) * 0.002 * p.life,
    );
    camera.fov = baseFov(camera.aspect) + p.warp;
    camera.updateProjectionMatrix();

    // the door and its light
    const angle = p.leaf * 82 * DEG;
    door.hinge.rotation.y = angle;
    door.tint(1 - p.dusk * 0.85);
    door.shade(angle);
    door.uniforms.light.value = p.light;
    door.uniforms.iris.value = p.iris;
    door.uniforms.seam.value = p.seam;
    door.uniforms.rays.value = p.rays;
    door.uniforms.time.value = elapsed;
    door.rays.visible = p.rays > 0.001;
    meadow.uniforms.dusk.value = p.dusk;
    meadow.uniforms.spill.value = p.rays;
    fore.uniforms.dusk.value = p.dusk;
    fore.uniforms.time.value = elapsed;
    fore.uniforms.wind.value = p.life;
    fore.uniforms.life.value = p.life;
    cosmos.uniforms.time.value = elapsed;

    crossed = camera.position.z < DOOR.z - 0.05;
    if (crossed) {
      renderPass.scene = cosmos.scene;
    } else {
      renderPass.scene = meadowScene;
      if (p.leaf > 0.001) {
        renderer.setRenderTarget(cosmosTarget);
        renderer.render(cosmos.scene, camera);
        renderer.setRenderTarget(null);
      }
    }
    composer.render(dt);
  };
  gsap.ticker.add(tick);

  return {
    params,
    inCosmos: () => crossed,
    manual: (on) => {
      manual = on;
    },
    step: (deltaMs) => frame(deltaMs),
    dispose: () => {
      gsap.ticker.remove(tick);
      observer.disconnect();
      for (const scene of [meadowScene, cosmos.scene]) {
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : mesh.material
              ? [mesh.material]
              : [];
          for (const m of mats) {
            for (const v of Object.values(m))
              if (v instanceof THREE.Texture) v.dispose();
            m.dispose();
          }
        });
      }
      for (const t of [photo, frameTex, leafTex, grassTex]) t.dispose();
      cosmosTarget.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
