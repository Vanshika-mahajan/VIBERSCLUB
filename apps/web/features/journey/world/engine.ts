import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { gsap } from "@/lib/motion/gsap";
import { makeCosmos } from "./cosmos";
import { makeDoor } from "./door";
import { DOOR, JAMB_DEPTH, PHOTO_ASPECT, PHOTO_FOV } from "./layout";
import { makeNightland } from "./nightland";
import { makePlanet, PLANET_RADIUS } from "./planet";
import { cameraAt, initialParams, type WorldParams } from "./params";

export type World = {
  params: WorldParams;
  /** true once the camera has passed through the doorway */
  inCosmos: () => boolean;
  /** review tooling: stop the loop and draw one frame at a time */
  manual: (on: boolean) => void;
  step: (deltaMs: number) => void;
  /** review tooling: the camera and the door, to render the fallback's stills */
  dev: { camera: THREE.PerspectiveCamera; door: THREE.Object3D };
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
export async function createWorld(
  canvas: HTMLCanvasElement,
  params: WorldParams = initialParams(),
): Promise<World> {
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
  const [frameTex, leafTex] = await Promise.all([
    load("/journey/door-frame.webp", loader, maxAniso),
    load("/journey/door-leaf.webp", loader, maxAniso),
  ]);

  const camera = new THREE.PerspectiveCamera(PHOTO_FOV, 1, 0.05, 3000);
  camera.rotation.order = "YXZ";

  const meadowScene = new THREE.Scene();
  // fewer grass blades where there are fewer pixels to fill
  const night = makeNightland({
    grass:
      Math.min(window.innerWidth * window.innerHeight, 2_000_000) > 600_000
        ? 80000
        : 45000,
  });
  const door = makeDoor(frameTex, leafTex);
  meadowScene.add(night.group, door.group);
  const cosmos = makeCosmos();
  const planet = await makePlanet(maxAniso);
  cosmos.scene.add(planet.root);

  // multisampled targets: smooth edges on the door, the grass and the globe. The cosmos is only seen
  // through the doorway (under its light) until we cross, so it renders a little smaller there.
  const COSMOS_SCALE = 0.8;
  const cosmosTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  door.uniforms.cosmos.value = cosmosTarget.texture;

  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    }),
  );
  const renderPass = new RenderPass(meadowScene, camera);
  // only light brighter than the photo's whites blooms: the doorway, the shafts, the brightest stars
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 1.0);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let width = 0;
  let height = 0;
  // the most pixels per CSS pixel we draw; lowered a step at a time if the device can't keep up
  let maxRatio = 2;
  let ratio = 1;
  const resize = (force = false) => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (!force && w === width && h === height)) return;
    width = w;
    height = h;
    ratio = Math.min(window.devicePixelRatio || 1, maxRatio);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    cosmosTarget.setSize(
      Math.round(w * ratio * COSMOS_SCALE),
      Math.round(h * ratio * COSMOS_SCALE),
    );
    // the doorway samples the cosmos by screen position: in the drawing buffer's pixels
    door.uniforms.res.value.set(Math.round(w * ratio), Math.round(h * ratio));
    cosmos.uniforms.pixel.value = ratio;
    planet.uniforms.pixel.value = ratio;
    night.uniforms.pixel.value = ratio;
    camera.aspect = w / h;
  };
  const observer = new ResizeObserver(() => resize());
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
    // moonlight: the door is a pale shape in the dark, warmed by the lanterns beside it
    door.tint((0.5 + 0.5 * p.day) * (1 - p.dusk * 0.85));
    door.shade(angle);
    door.uniforms.light.value = p.light;
    door.uniforms.iris.value = p.iris;
    door.uniforms.seam.value = p.seam;
    door.uniforms.rays.value = p.rays;
    door.uniforms.time.value = elapsed;
    door.rays.visible = p.rays > 0.001;
    night.uniforms.dusk.value = p.dusk;
    night.uniforms.day.value = p.day;
    night.uniforms.spill.value = p.rays;
    night.uniforms.time.value = elapsed;
    night.uniforms.wind.value = p.life;
    night.uniforms.life.value = Math.max(p.life, 0.6);
    night.uniforms.scale.value =
      renderer.domElement.height / (2 * Math.tan((camera.fov / 2) * DEG));
    night.face(camera);
    cosmos.uniforms.time.value = elapsed;

    // the sphere: sized and placed on screen by the params, at whatever distance gives that size
    planet.root.visible = p.planet > 0.002;
    if (planet.root.visible) {
      const tanV = Math.tan((camera.fov / 2) * DEG);
      const share = (p.planet * Math.min(width, height)) / height; // radius over half the height
      const alpha = Math.atan(share * tanV);
      // close enough to fill the screen with the valley, never inside the atmosphere
      const dist = Math.max(
        PLANET_RADIUS / Math.sin(alpha),
        PLANET_RADIUS * 1.045,
      );
      planet.root.position.set(
        camera.position.x,
        camera.position.y + p.planetY * dist * tanV,
        camera.position.z - dist,
      );
      planet.spin.rotation.y = planet.facing.spin + p.spin;
      planet.tilt.rotation.x = planet.facing.tilt;
      planet.uniforms.manali.value = p.manali;
      planet.uniforms.marker.value = p.marker;
      planet.uniforms.time.value = elapsed;
    }

    // crossed once we're past the light at the far end of the doorway's reveal
    crossed = camera.position.z < DOOR.z - JAMB_DEPTH - 0.05;
    if (crossed) {
      renderPass.scene = cosmos.scene;
      cosmos.uniforms.pixel.value = ratio;
      planet.uniforms.pixel.value = ratio;
    } else {
      renderPass.scene = meadowScene;
      if (p.leaf > 0.001) {
        // stars keep their size in the smaller render
        cosmos.uniforms.pixel.value = ratio * COSMOS_SCALE;
        planet.uniforms.pixel.value = ratio * COSMOS_SCALE;
        renderer.setRenderTarget(cosmosTarget);
        renderer.render(cosmos.scene, camera);
        renderer.setRenderTarget(null);
      }
    }
    composer.render(dt);
    if (!manual) watch(deltaMs);
  };

  // Keep it smooth: if frames run long for a while, draw fewer pixels (one step, then wait and see).
  // Only while the door is still shut: resizing the drawing buffer mid-journey made Safari flash black
  // for about a second, so the resolution is settled before Enter and then held. Never steps back up.
  const STEPS = [2, 1.6, 1.3, 1];
  let slow = 0;
  let cooldown = 0;
  const watch = (deltaMs: number) => {
    if (params.leaf > 0.001 || params.travel > 0.001 || crossed) return;
    if (cooldown > 0) {
      cooldown -= deltaMs;
      return;
    }
    // long frames from a hidden tab or a pause are not the GPU's fault
    if (deltaMs > 250) return;
    slow = deltaMs > 24 ? slow + 1 : Math.max(0, slow - 2);
    if (slow < 12) return;
    slow = 0;
    const next = STEPS.find(
      (r) => r < Math.min(maxRatio, window.devicePixelRatio || 1),
    );
    if (next === undefined) return;
    maxRatio = next;
    resize(true);
    cooldown = 1500;
  };

  // Warm up: draw every scene once, unseen, with the door open and the sphere in view, so shaders are
  // compiled and textures are on the GPU before the visitor's first click. Nothing gets built mid-swing.
  {
    const saved = { ...params };
    await renderer.compileAsync(meadowScene, camera).catch(() => undefined);
    await renderer.compileAsync(cosmos.scene, camera).catch(() => undefined);
    Object.assign(params, { leaf: 0.5, light: 1, rays: 1, planet: 0.6 });
    frame(16);
    Object.assign(params, { travel: 1 });
    frame(16);
    Object.assign(params, saved);
    elapsed = 0;
    frame(16);
  }
  gsap.ticker.add(tick);

  return {
    params,
    inCosmos: () => crossed,
    manual: (on) => {
      manual = on;
    },
    step: (deltaMs) => frame(deltaMs),
    dev: { camera, door: door.group },
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
      for (const t of [frameTex, leafTex]) t.dispose();
      planet.dispose();
      cosmosTarget.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
