import * as THREE from "three";
import { DOOR, EYE_HEIGHT, PHOTO_ASPECT, PHOTO_FOV, PITCH } from "./layout";

/**
 * The photo becomes a place by projecting it, from where it was taken, onto simple stand-in shapes:
 * the ground, and a far backdrop for the tree line and sky. From the start position the result is
 * exactly the photo; as the camera moves, the ground slides beneath it and the trees hold back,
 * which is what gives the flight its depth. (The same trick film matte painters use.)
 */
export function makeProjector() {
  const projector = new THREE.PerspectiveCamera(
    PHOTO_FOV,
    PHOTO_ASPECT,
    0.1,
    2000,
  );
  projector.position.set(0, EYE_HEIGHT, 0);
  projector.rotation.set(PITCH, 0, 0, "YXZ");
  projector.updateMatrixWorld(true);
  return new THREE.Matrix4().multiplyMatrices(
    projector.projectionMatrix,
    projector.matrixWorldInverse,
  );
}

const VERT = /* glsl */ `
  uniform mat4 uProjVP;
  varying vec4 vProj;
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vProj = uProjVP * wp;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uDusk;
  uniform float uSpill;
  uniform vec3 uSpillAt;
  uniform float uGround;
  varying vec4 vProj;
  varying vec3 vWorld;

  void main() {
    vec2 uv = vProj.xy / vProj.w * 0.5 + 0.5;
    // the photo's average sky colour along its top edge
    vec3 avg = vec3(0.0);
    for (int k = 0; k < 9; k++) avg += texture2D(uMap, vec2(0.06 + float(k) * 0.11, 0.97)).rgb;
    avg /= 9.0;
    // below the photo (tall screens): mirror the near grass so the meadow simply continues
    vec2 m = vec2(uv.x, uv.y < 0.0 ? -uv.y : uv.y);
    vec3 c = texture2D(uMap, clamp(m, 0.001, 0.999)).rgb;
    // above it (tall screens): clouds cut by the top edge would streak, so the top few percent fades
    // into that average blue, which deepens upward
    c = mix(c, avg, smoothstep(0.93, 0.995, uv.y));
    c = mix(c, vec3(0.16, 0.36, 0.62), smoothstep(1.0, 1.25, uv.y));
    // the light from the open door, thrown forward across the grass
    if (uGround > 0.5) {
      vec2 d = (vWorld.xz - uSpillAt.xz) * vec2(0.9, 0.42);
      c += vec3(1.0, 0.68, 0.34) * uSpill * 1.6 * exp(-dot(d, d) * 1.4);
    }
    // midnight settles over the meadow
    c = mix(c, c * vec3(0.025, 0.035, 0.09), uDusk);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

export type Meadow = {
  group: THREE.Group;
  uniforms: { dusk: THREE.IUniform<number>; spill: THREE.IUniform<number> };
};

export function makeMeadow(photo: THREE.Texture): Meadow {
  const projVP = makeProjector();
  const dusk = { value: 0 };
  const spill = { value: 0 };
  const material = (ground: boolean) =>
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uMap: { value: photo },
        uProjVP: { value: projVP },
        uDusk: dusk,
        uSpill: spill,
        uSpillAt: { value: new THREE.Vector3(DOOR.x, 0, DOOR.z + 2.2) },
        uGround: { value: ground ? 1 : 0 },
      },
    });

  const group = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    material(true),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -280;
  group.add(ground);

  // the tree line and sky, far enough back to hold still while the ground slides
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 700),
    material(false),
  );
  backdrop.position.set(0, 349, -150);
  group.add(backdrop);
  return { group, uniforms: { dusk, spill } };
}

/** A soft shadow texture drawn once on a canvas. */
export function softShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 32, 4, 128, 32, 128);
  grad.addColorStop(0, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 64);
  return new THREE.CanvasTexture(c);
}
