import * as THREE from "three";
import { makePlanet, PLANET_RADIUS } from "@/features/journey/world/planet";

/**
 * The journey's Earth, on its own small renderer for the opening of Home: close up and facing Manali,
 * as the stardust settles into it, turning slowly. It draws on black; the stage tones it in sage with
 * a luminosity blend, like the photographs. Draws only while it is on screen.
 */
export async function makeOpeningPlanet(host: HTMLElement) {
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const planet = await makePlanet(renderer.capabilities.getMaxAnisotropy());
  scene.add(planet.root);
  planet.tilt.rotation.x = planet.facing.tilt;
  planet.uniforms.manali.value = 1;
  planet.uniforms.marker.value = 1;

  let w = 0,
    h = 0;
  const resize = () => {
    const cw = host.clientWidth,
      ch = host.clientHeight;
    if (!cw || !ch || (cw === w && ch === h)) return;
    w = cw;
    h = ch;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    planet.uniforms.pixel.value = ratio;
    camera.aspect = w / h;
    // cover: the planet fills the longer side of the stage, as the still it takes over from
    const a = Math.max(camera.aspect, 1);
    const fit = (PLANET_RADIUS * 1.04) / (Math.tan((20 * Math.PI) / 180) * a);
    camera.position.set(0, 0, Math.max(PLANET_RADIUS + 1.5, fit));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    /** on: whether it shows at all; time: the frame time in ms */
    render(on: boolean, time: number) {
      if (!on) return;
      resize();
      // a slow turn around Manali, back and forth, so the valley stays in view
      planet.spin.rotation.y =
        planet.facing.spin + Math.sin(time * 0.00012) * 0.18;
      planet.uniforms.time.value = time / 1000;
      renderer.render(scene, camera);
    },
    dispose() {
      observer.disconnect();
      planet.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      canvas.remove();
    },
  };
}
