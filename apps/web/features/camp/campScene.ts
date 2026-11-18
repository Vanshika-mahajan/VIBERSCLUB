import * as THREE from "three";
import { addMeadowLife } from "@/features/entry/scenery";

/**
 * ARPIT's sunset camp brought to life, with the movements of ThreeUI's "Temple Night" (their
 * reference; the same motions as the meadow at the door, features/entry/scenery.ts). The picture is a
 * plane far behind, covering the view; a motion mask (public/camp/sunset-motion.png) says how each part
 * of it moves:
 *   red    how much it sways in the wind (grass, flowers, the young pines, the tree, the flags)
 *   blue   how: 0 blade by blade, 0.5 the prayer flags fluttering fast, 1 the tree in whole sprigs
 *   green  drifting slowly from side to side (the clouds and the valley mist)
 *   alpha  the river glinting in the low sun
 * The sign's lamp and the lantern flicker like Temple Night's lanterns, the sun's glow breathes, and in
 * front of the picture haze drifts, embers rise, leaves fall, wisps trail the pointer and the view
 * leans gently after it.
 */
const PICTURE = { w: 1670, h: 941 };
const CAM = { z: 6, fov: 38 };
const PLANE_Z = -14;
// where the lights are in the picture (fractions from its top left)
const LAMP = { u: 0.17, v: 0.435 };
const LANTERN = { u: 0.111, v: 0.892 };
const SUN = { u: 0.297, v: 0.468 };

export async function createCampScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 0.05, 100);
  camera.position.set(0, 0, CAM.z);
  const trash: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T) => (trash.push(d), d);
  const loader = new THREE.TextureLoader();
  const [picture, motion] = await Promise.all([loader.loadAsync("/camp/sunset.webp"), loader.loadAsync("/camp/sunset-motion.png")]);
  keep(picture);
  keep(motion);
  picture.colorSpace = THREE.SRGBColorSpace;
  picture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const uT = { value: 0 };
  const material = keep(new THREE.MeshBasicMaterial({ map: picture, toneMapped: false, depthWrite: false }));
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uT = uT;
    shader.uniforms.uMotion = { value: motion };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uT;\nuniform sampler2D uMotion;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        vec2 uv = vMapUv;
        vec4 mm = texture2D(uMotion, uv);
        float sway = mm.r, drift = mm.g, how = mm.b, glint = mm.a;
        float coarse = smoothstep(0.7, 1.0, how);
        float flutter = clamp(1.0 - abs(how - 0.5) * 4.0, 0.0, 1.0);
        // gusts roll across from the left, so not everything moves at once
        float gust = 0.55 + 0.45 * sin(uT * 0.55 - uv.x * 5.0 + sin(uT * 0.23) * 1.5);
        // Temple Night's sway (sin 0.85, cos 0.62 at a third), blade by blade or in whole sprigs
        float phF = uv.x * 55.0 + uv.y * 31.0;
        float phC = uv.x * 9.0 + uv.y * 4.0;
        vec2 fine = vec2(sin(uT * 0.85 + phF), cos(uT * 0.62 + phF * 1.7) * 0.35) * 0.0017;
        vec2 sprig = vec2(sin(uT * 0.85 + phC), cos(uT * 0.62 + phC * 1.7) * 0.35) * 0.0026;
        // the prayer flags flutter quickly in ripples running along the strings
        vec2 flap = vec2(sin(uT * 3.4 - uv.x * 90.0), cos(uT * 2.9 - uv.x * 70.0) * 0.7) * 0.0016;
        vec2 d = mix(mix(fine, sprig, coarse), flap, flutter) * sway * mix(gust, 1.0, flutter * 0.6);
        d.y *= 1.775; // the picture is wider than tall: the same distance both ways
        // the clouds and the valley mist drift slowly from side to side, like Temple Night's haze
        d.x += sin(uT * 0.11 + uv.y * 3.0) * 0.006 * drift;
        vec4 sampledDiffuseColor = texture2D(map, uv + d);
        diffuseColor *= sampledDiffuseColor;
        vec2 a = vec2(1.775, 1.0);
        // the river glinting: small bright points that come and go along the water
        float g = sin(uv.x * 950.0 + uT * 2.1) * sin(uv.y * 420.0 - uT * 1.3 + sin(uv.x * 60.0));
        diffuseColor.rgb += glint * vec3(1.0, 0.82, 0.55) * pow(max(g, 0.0), 8.0) * 0.55;
        // the lamp over the sign and the lantern flicker like Temple Night's lanterns
        float f1 = 0.86 + 0.22 * sin(uT * 2.3 + 2.1) + 0.1 * sin(uT * 1.9) + 0.06 * sin(uT * 11.0);
        float f2 = 0.86 + 0.22 * sin(uT * 3.0 + 4.2) + 0.1 * sin(uT * 1.7 + 1.0) + 0.06 * sin(uT * 13.0 + 2.0);
        float l1 = exp(-pow(length((uv - vec2(${LAMP.u}, ${1 - LAMP.v})) * a) / 0.045, 2.0));
        float l2 = exp(-pow(length((uv - vec2(${LANTERN.u}, ${1 - LANTERN.v})) * a) / 0.04, 2.0));
        diffuseColor.rgb += vec3(1.0, 0.62, 0.25) * (l1 * f1 + l2 * f2) * 0.16;
        // the sun's glow breathing slowly
        float sg = exp(-pow(length((uv - vec2(${SUN.u}, ${1 - SUN.v})) * a) / 0.11, 2.0));
        diffuseColor.rgb += vec3(1.0, 0.7, 0.35) * sg * (0.05 + 0.04 * sin(uT * 0.43));`,
      );
  };
  const plane = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), material);
  plane.position.z = PLANE_Z;
  plane.renderOrder = -10;
  scene.add(plane);

  const halfAt = (z: number) => (CAM.z - z) * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
  const life = addMeadowLife(scene, camera, uT, keep, {
    ground: () => -halfAt(0) - 0.05,
    small: Math.min(innerWidth, innerHeight) < 700,
    hazeY: [-1.7, 1.3],
    mote: ["rgba(255,206,130,1)", "rgba(255,140,60,0.45)"],
  });

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
    // cover the view, with a little to spare for the lean after the pointer; on tall screens keep the
    // sign and the sun in view (as the still picture does)
    const vh = 2 * halfAt(PLANE_Z) * 1.03;
    const vw = vh * camera.aspect;
    const img = PICTURE.w / PICTURE.h;
    const W = Math.max(vw, vh * img);
    const H = W / img;
    plane.scale.set(W, H, 1);
    const spare = (W - vw) / 2;
    plane.position.x = camera.aspect < 1 ? spare * (1 - 2 * 0.08) : 0;
  };

  const render = (dt: number) => {
    resize();
    life.update(dt, 0);
    camera.position.set(life.offset.x, life.offset.y, CAM.z);
    renderer.render(scene, camera);
  };

  return {
    render,
    setPointer: life.setPointer,
    dispose: () => {
      trash.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
