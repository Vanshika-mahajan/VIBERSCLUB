import * as THREE from "three";

/**
 * ARPIT's sunset camp, with the trees moving gently in the breeze. ARPIT asked for no jittery effects
 * (2026-11-18), so of Temple Night's movements only a slow, smooth sway stays: the big tree and the young
 * pines on the slope bend in broad waves, and the prayer flags lift and fall softly, as a motion mask
 * says (public/camp/sunset-motion.png: red = the trees, green = the flags). Everything else in the picture stays still.
 */
const PICTURE = { w: 1670, h: 941 };
const CAM = { z: 6, fov: 38 };
const PLANE_Z = -14;

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
        float sway = mm.r, flag = mm.g;
        // the trees bend slowly in the breeze: broad, smooth waves (Temple Night's sin/cos pair, slowed
        // right down), with gusts that come and go, so nothing flickers or shimmers
        float gust = 0.6 + 0.4 * sin(uT * 0.35 - uv.x * 3.0);
        float ph = uv.x * 4.0 + uv.y * 2.0;
        vec2 d = vec2(sin(uT * 0.6 + ph), cos(uT * 0.45 + ph * 1.3) * 0.3) * 0.0024 * sway * gust;
        // the prayer flags lift and fall in the same breeze, a soft wave running along each string
        d += vec2(sin(uT * 1.1 - uv.x * 22.0) * 0.4, sin(uT * 1.4 - uv.x * 26.0 + 0.8)) * 0.0014 * flag * gust;
        d.y *= 1.775; // the picture is wider than tall: the same distance both ways
        vec4 sampledDiffuseColor = texture2D(map, uv + d);
        diffuseColor *= sampledDiffuseColor;`,
      );
  };
  const plane = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), material);
  plane.position.z = PLANE_Z;
  plane.renderOrder = -10;
  scene.add(plane);

  const halfAt = (z: number) => (CAM.z - z) * Math.tan(THREE.MathUtils.degToRad(CAM.fov / 2));
  let t = 0;

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
    // cover the view exactly as the still picture does; on tall screens keep the sign and the sun in view
    const vh = 2 * halfAt(PLANE_Z);
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
    t += dt;
    uT.value = t;
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
