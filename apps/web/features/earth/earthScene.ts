import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { makeCosmos } from "@/features/journey/world/cosmos";
import { makePlanet, PLANET_RADIUS } from "@/features/journey/world/planet";
import { PHOTO_FOV } from "@/features/journey/world/layout";

/**
 * The journey's Earth on its own (ARPIT, 2026-11-19: "give me the earth", then "I want this part"):
 * drawn exactly as the journey drew it once through the door (the same starfield and galaxy band,
 * cosmos.ts, and the same bloom), playing the same moves as timelines/discovery.ts: the globe turning
 * fast and slowing until Manali comes round, then the dive toward it as the surface becomes the valley
 * and the marker lights. It holds there, close over Manali.
 */
const TAU = Math.PI * 2;
const ORB_START = 0.55;
const SPIN_ARRIVE = TAU * 1.45;
const SPIN_SLOW = 4.6;
const DIVE_FROM = 0.78;
const DIVE_TO = 7;
const DIVE_AT = 3.4;
const DIVE_LEN = 4.4;
/** the dive runs to its end, as in the journey */
const HOLD = DIVE_AT + DIVE_LEN;
/** the valley opens out into the home page's own colour from here (as in the journey) */
export const ARRIVE_AT = 6.6;
/** Home takes over here, when that colour has filled the screen */
export const ENTRY_LENGTH = ARRIVE_AT + 1.2;

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 3);

/** the journey's params at a moment of the sequence */
export function at(t: number, hold = HOLD) {
  const k = Math.min(t, hold);
  const spin = SPIN_ARRIVE * (1 - power3Out(clamp01(k / SPIN_SLOW)));
  const planet =
    k < DIVE_AT
      ? ORB_START + (DIVE_FROM - ORB_START) * sineInOut(clamp01(k / DIVE_AT))
      : DIVE_FROM *
        Math.pow(
          DIVE_TO / DIVE_FROM,
          Math.pow(clamp01((k - DIVE_AT) / DIVE_LEN), 2),
        );
  const manali = sineInOut(clamp01((k - 3.7) / 1.6));
  // lights up over Manali, and fades as we fall in past it
  const marker = power3Out(clamp01((k - 4.6) / 0.7)) * (1 - clamp01((k - 6.1) / 0.8) ** 2);
  return { spin, planet, manali, marker };
}

export async function makeEarth(canvas: HTMLCanvasElement, hold = HOLD) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const camera = new THREE.PerspectiveCamera(PHOTO_FOV, 1, 0.05, 3000);
  const cosmos = makeCosmos();
  const planet = await makePlanet(renderer.capabilities.getMaxAnisotropy());
  cosmos.scene.add(planet.root);
  planet.tilt.rotation.x = planet.facing.tilt;

  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    }),
  );
  composer.addPass(new RenderPass(cosmos.scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let width = 0;
  let height = 0;
  let start = -1;
  let waiting = false;
  let idleSpin = 0;
  let residual = 0;
  let last = 0;
  let size = ORB_START;
  const place = () => {
    const tanV = Math.tan((camera.fov / 2) * (Math.PI / 180));
    const share = (size * Math.min(width, height)) / height;
    const dist = Math.max(
      PLANET_RADIUS / Math.sin(Math.atan(share * tanV)),
      PLANET_RADIUS * 1.045,
    );
    planet.root.position.set(0, 0, -dist);
  };
  const resize = () => {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    // the bloom pass is costly on phones with dense screens: 1.5 looks the same there and keeps it smooth
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
    bloom.setSize(width * ratio, height * ratio);
    cosmos.uniforms.pixel.value = ratio;
    planet.uniforms.pixel.value = ratio;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    place();
  };
  resize();

  return {
    resize,
    /** start the sequence again from the turning globe */
    replay() {
      start = -1;
      waiting = false;
      // whatever part of a turn it is through carries on and settles as it slows, so there is no jump
      residual = idleSpin % TAU;
      idleSpin = 0;
    },
    /** behind the closed door: the globe turning fast, as it is when the door opens */
    wait() {
      waiting = true;
    },
    /** renders a frame; returns the seconds into the sequence */
    render(time: number, freeze?: number) {
      const s = time / 1000;
      const dt = Math.min(0.05, s - last || 0.016);
      last = s;
      if (waiting) {
        // as fast as the sequence starts (about a turn a second), so the door opens onto it mid-spin
        idleSpin += dt * ((3 * SPIN_ARRIVE) / SPIN_SLOW);
      } else if (start < 0) start = s;
      const t = waiting ? 0 : (freeze ?? s - start);
      const p = at(t, hold);
      if (waiting) p.spin += idleSpin;
      else p.spin += residual * (1 - power3Out(clamp01(t / SPIN_SLOW)));
      size = p.planet;
      place();
      planet.spin.rotation.y = planet.facing.spin + p.spin;
      planet.uniforms.manali.value = p.manali;
      planet.uniforms.marker.value = p.marker;
      planet.uniforms.time.value = s;
      cosmos.uniforms.time.value = s;
      composer.render(dt);
      return t;
    },
    dispose() {
      planet.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
