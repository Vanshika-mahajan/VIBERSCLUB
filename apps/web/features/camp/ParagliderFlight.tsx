"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { canUse3D } from "@/features/journey/world/support";
import { handover, preloadHome } from "./handover";

/**
 * ARPIT's own paraglider (their code and pilot picture, 2026-11-20), flying over the camp experiment.
 * Their flight is kept as they wrote it: the pilot sprite, the suspension lines and the three phases (descend from high, fly straight at us, accelerate until the canopy covers the
 * screen). The flat canopy became ARPIT's own canopy picture (public/camp/canopy.webp, 2026-11-20) on a
 * curved sheet that breathes and sways. Here it draws on a transparent canvas over the camp instead of over its own background,
 * starts once the door has gone, and when the canopy covers the screen Home opens underneath
 * (the same hand-over as the camp: the frame lifts away over Home).
 */
const WAIT_AFTER_DOOR = 600; // ms after the door has gone before the flight starts

export function ParagliderFlight() {
  const mountRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !canUse3D()) return;
    router.prefetch("/home");
    const homeReady = preloadHome();

    // SCENE, CAMERA, RENDERER (as ARPIT wrote them, with a transparent background)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    // PARAGLIDER
    const paraglider = new THREE.Group();
    paraglider.visible = false;
    scene.add(paraglider);
    const canopy = new THREE.Group();
    paraglider.add(canopy);
    // the canopy: ARPIT's own canopy picture (2026-11-20), cut out, on a gently curved sheet that breathes
    const CANOPY_W = 6.4;
    const CANOPY_H = (CANOPY_W * 705) / 1883; // the picture's proportions
    const COLS = 48;
    const ROWS = 8;
    const canopyGeo = new THREE.PlaneGeometry(CANOPY_W, CANOPY_H, COLS, ROWS);
    // graded into the camp's light (ARPIT: the colours should feel as if it belongs to the camp): the
    // photo is crisp and studio-bright, the camp is a hazy golden sunset with the sun low on the left
    // behind the glider, so the cloth is seen against the light: a little less saturated, warmer and
    // darker, glowing where the sun shines through it, brighter on the sun's side, softened by the
    // valley's haze while it is far off
    const canopyMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        map: { value: null as THREE.Texture | null },
        haze: { value: 0 },
        hazeColor: { value: new THREE.Color(0xe99a6b) },
        sunColor: { value: new THREE.Color(0xfbcd7d) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform float haze;
        uniform vec3 hazeColor, sunColor;
        varying vec2 vUv;
        void main() {
          vec4 tex = texture2D(map, vUv);
          if (tex.a < 0.02) discard;
          vec3 c = tex.rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, 0.8);
          // against the light: warmer and darker, the white panels a warm cream
          c *= vec3(1.0, 0.84, 0.66) * 0.86;
          // the sun through the cloth: the top of the canopy and the sun's side glow
          float glow = smoothstep(0.25, 1.0, vUv.y) * 0.55 + (1.0 - vUv.x) * 0.25;
          c += c * sunColor * glow * 0.45;
          c *= mix(1.08, 0.88, vUv.x);
          // the valley's haze, and a little everywhere so the shadows are never black
          c = mix(c, hazeColor * 0.75, 0.06 + 0.55 * haze);
          gl_FragColor = vec4(c, tex.a);
          #include <colorspace_fragment>
        }`,
    });
    new THREE.TextureLoader().load("/camp/canopy.webp", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      canopyMat.uniforms.map.value = texture;
    });
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.frustumCulled = false;
    canopy.add(canopyMesh);
    const canopyPos = canopyGeo.attributes.position as THREE.BufferAttribute;
    const canopyUv = canopyGeo.attributes.uv as THREE.BufferAttribute;
    /** where a spot of the picture sits on the canopy (u 0..1 across, v 0..1 from the top), breathing over time */
    const onCanopy = (u: number, v: number, t: number, out: THREE.Vector3) => {
      const x = (u - 0.5) * 2;
      // the picture's bottom edge sits at the canopy's origin, its top about 2.4 up, like ARPIT's canopy
      out.set(
        x * (CANOPY_W / 2) * (1 + 0.012 * Math.sin(t * 1.3)),
        (1 - v) * CANOPY_H,
        // tips a little toward us, so the wing has depth when it banks; the cloth ripples and the tips flex
        0.55 * x * x +
          0.035 * Math.sin(t * 2.3 + x * 4.0 + v * 2.0) +
          0.05 * x * x * Math.sin(t * 1.7 - x),
      );
      out.y += 0.04 * x * x * Math.sin(t * 1.9 - x * 1.5);
      return out;
    };
    const spot = new THREE.Vector3();
    const breathe = (t: number) => {
      for (let k = 0; k < canopyPos.count; k++) {
        onCanopy(canopyUv.getX(k), 1 - canopyUv.getY(k), t, spot);
        canopyPos.setXYZ(k, spot.x, spot.y, spot.z);
      }
      canopyPos.needsUpdate = true;
    };
    // where the lines meet the canopy: along the bottom edge of the picture (measured from it)
    const EDGE: [number, number][] = [
      [0.06, 0.86],
      [0.106, 0.747],
      [0.171, 0.655],
      [0.237, 0.594],
      [0.303, 0.548],
      [0.369, 0.536],
      [0.434, 0.524],
      [0.5, 0.52],
      [0.566, 0.517],
      [0.631, 0.541],
      [0.697, 0.572],
      [0.763, 0.621],
      [0.829, 0.692],
      [0.894, 0.801],
      [0.94, 0.9],
    ];
    canopy.position.set(0, 0.35, 0);

    // PILOT: ARPIT's PNG as a sprite
    let pilot: THREE.Sprite | null = null;
    new THREE.TextureLoader().load("/camp/pilot.png", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      const pilotSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.01,
          depthTest: true,
          depthWrite: false,
        }),
      );
      pilotSprite.position.set(0, -0.95, 0.25);
      pilotSprite.scale.set(2.4, 3.0, 1);
      pilotSprite.renderOrder = 10;
      paraglider.add(pilotSprite);
      pilot = pilotSprite;
    });

    // SUSPENSION LINES: fine lines from the canopy's bottom edge down to the pilot's two risers, moving with both
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x2b2420,
      transparent: true,
      opacity: 0.5,
    });
    const linePos = new Float32Array(EDGE.length * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMaterial);
    lines.frustumCulled = false;
    paraglider.add(lines);
    const riser = new THREE.Vector3();
    const anchor = new THREE.Vector3();
    const placeLines = (t: number) => {
      canopy.updateMatrix();
      const px = pilot ? pilot.position.x : 0;
      EDGE.forEach(([u, v], k) => {
        onCanopy(u, v - 0.01, t, anchor).applyMatrix4(canopy.matrix);
        // the risers clip into the harness at the pilot's shoulders
        riser.set(px + (u < 0.5 ? -0.32 : 0.32), -0.5, 0.26);
        linePos.set(
          [anchor.x, anchor.y, anchor.z, riser.x, riser.y, riser.z],
          k * 6,
        );
      });
      (lineGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    };

    // FLIGHT SETTINGS (ARPIT's values)
    const flightY = -2;
    const flightStartY = 8;
    const start = new THREE.Vector3(0, flightStartY, -50);
    const cameraApproach = new THREE.Vector3(0, flightY, 7.0);
    // the end: as in ARPIT's flight, the canopy rushes in until it covers the screen. The picture is an
    // arc, so it ends with the band of red and orange cells across the middle of the canopy filling the
    // view (about 2.4 in front of us), the pilot far below and out of sight
    const END = { y: -4.3, scale: 2, z: 7.64 };
    const duration = 4000;

    let startTime = -1;
    let doorGoneAt = -1;
    let left = false;
    let frame = 0;

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      // the flight waits for the door to have gone
      if (startTime < 0) {
        if (document.querySelector("[data-entry]")) return;
        if (doorGoneAt < 0) doorGoneAt = now;
        if (now - doorGoneAt < WAIT_AFTER_DOOR) return;
        startTime = now;
        paraglider.visible = true;
      }
      const progress = Math.min((now - startTime) / duration, 1);

      if (progress < 0.3) {
        // PHASE 1: high, descending to the flight height
        const t = progress / 0.3;
        paraglider.position.set(
          0,
          THREE.MathUtils.lerp(flightStartY, flightY, t),
          THREE.MathUtils.lerp(start.z, start.z + 8, t),
        );
        paraglider.scale.setScalar(0.72);
      } else if (progress < 0.78) {
        // PHASE 2: straight at the camera
        const t = (progress - 0.3) / 0.48;
        paraglider.position.set(
          0,
          flightY,
          THREE.MathUtils.lerp(start.z + 8, cameraApproach.z, t),
        );
        paraglider.scale.setScalar(0.72);
      } else {
        // PHASE 3: accelerating in until the canopy fills the screen
        const t = (progress - 0.78) / 0.22;
        const eased = 1 - Math.pow(1 - t, 4);
        paraglider.position.set(
          0,
          THREE.MathUtils.lerp(flightY, END.y, eased),
          THREE.MathUtils.lerp(cameraApproach.z, END.z, eased),
        );
        paraglider.scale.setScalar(
          THREE.MathUtils.lerp(0.72, END.scale, eased),
        );
      }
      // life: the canopy breathes and sways, banking a little, the pilot swinging under it a moment later;
      // over the last rush the sway settles
      const time = (now - startTime) / 1000;
      const end =
        progress < 0.78 ? 0 : 1 - Math.pow(1 - (progress - 0.78) / 0.22, 4);
      const calm = 1 - end;
      paraglider.rotation.set(
        0.04 * Math.sin(time * 0.8) * calm,
        0,
        0.07 * Math.sin(time * 0.9) * calm,
      );
      canopy.rotation.set(0, 0, 0.035 * Math.sin(time * 0.9 - 0.7) * calm);
      if (pilot) {
        pilot.position.x = 0.08 * Math.sin(time * 0.9 - 1.2) * calm;
        pilot.material.rotation = -0.05 * Math.sin(time * 0.9 - 1.2) * calm;
      }
      // far off, the haze of the valley lies over it; close by it is clear
      canopyMat.uniforms.haze.value = Math.min(
        1,
        Math.max(0, (camera.position.z - paraglider.position.z - 8) / 45),
      );
      breathe(time);
      placeLines(time);
      renderer.render(scene, camera);

      // the canopy covers the screen: lay this frame over everything and open Home underneath
      if (progress >= 1 && !left) {
        left = true;
        try {
          const img = new Image();
          img.alt = "";
          img.src = renderer.domElement.toDataURL("image/jpeg", 0.9);
          handover.show(img, homeReady);
        } catch {
          /* Home simply opens */
        }
        router.push("/home");
        // pages stay mounted after leaving them: ready to fly again next time
        window.setTimeout(() => {
          startTime = -1;
          doorGoneAt = -1;
          left = false;
          paraglider.visible = false;
          renderer.render(scene, camera);
        }, 1500);
      }
    };
    frame = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frame);
      canopyGeo.dispose();
      canopyMat.uniforms.map.value?.dispose();
      canopyMat.dispose();
      window.removeEventListener("resize", handleResize);
      scene.traverse((object) => {
        const o = object as THREE.Mesh;
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) {
          (m as THREE.SpriteMaterial).map?.dispose();
          m.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [router]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 58,
      }}
    />
  );
}
