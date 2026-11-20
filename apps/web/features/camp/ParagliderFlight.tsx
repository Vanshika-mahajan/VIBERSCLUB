"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { canUse3D } from "@/features/journey/world/support";
import { handover, preloadHome } from "./handover";
import { makeWing } from "./wing";

/**
 * ARPIT's own paraglider (their code and pilot picture, 2026-11-20), flying over the camp experiment.
 * Their flight is kept as they wrote it: the pilot sprite, the suspension lines and the three phases (descend from high, fly straight at us, accelerate until the canopy covers the
 * screen). The flat canopy became a real wing that breathes and sways (ARPIT's choice, 2026-11-20,
 * features/camp/wing.ts), in their colours. Here it draws on a transparent canvas over the camp instead of over its own background,
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
    // the wing (features/camp/wing.ts): ARPIT's panel colours on a curved, breathing paraglider wing
    const colors = [
      0xd9471e, 0xf39a17, 0xffc94a, 0xe64e25, 0xf28a20, 0xffc94a, 0xd9471e,
    ];
    const wing = makeWing(colors);
    canopy.add(wing.group);
    // the low sun behind and to the left lights the top of the wing; the underside stays in its glow
    const sun = new THREE.DirectionalLight(0xffe2b8, 1.6);
    sun.position.set(-4, 6, -6);
    scene.add(sun);
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

    // SUSPENSION LINES: from the underside of the wing down to the pilot's two risers, moving with both
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.6,
    });
    const lineCount = wing.anchors.length;
    const linePos = new Float32Array(lineCount * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    paraglider.add(new THREE.LineSegments(lineGeo, lineMaterial));
    const riser = new THREE.Vector3();
    const anchor = new THREE.Vector3();
    const placeLines = () => {
      canopy.updateMatrix();
      const swing = pilot ? pilot.position.x : 0;
      wing.anchors.forEach((a, k) => {
        anchor.copy(a).applyMatrix4(canopy.matrix);
        // the risers clip into the harness at the pilot's shoulders
        const py = pilot ? pilot.position.y : -0.95;
        const pz = pilot ? pilot.position.z : 0.25;
        riser.set(swing + (a.x < 0 ? -0.42 : 0.42), py + 0.4, pz + 0.01);
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
    // the end (instead of ARPIT's flat canopy growing in front of the camera, which a wing with depth
    // cannot do): the wing rushes up and over us, rearing back so that its underside, with its seams and
    // cells, fills the whole screen; it ends behind us, its underside about 5 away, the pilot swung
    // through below and out of sight
    const END = { y: 1.9, pitch: -1.57, scale: 4.5, z: 15.6 };
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
      // life: the wing breathes and sways, banking a little, the pilot swinging under it a moment later;
      // over the last rush the sway settles and the wing pitches up over us
      const time = (now - startTime) / 1000;
      const end =
        progress < 0.78 ? 0 : 1 - Math.pow(1 - (progress - 0.78) / 0.22, 4);
      const calm = 1 - end;
      paraglider.rotation.set(
        0.04 * Math.sin(time * 0.8) * calm,
        0,
        0.07 * Math.sin(time * 0.9) * calm,
      );
      canopy.rotation.set(
        END.pitch * end,
        0,
        0.035 * Math.sin(time * 0.9 - 0.7) * calm,
      );
      if (pilot) {
        pilot.position.x = 0.08 * Math.sin(time * 0.9 - 1.2) * calm;
        // as the wing rears up over us the pilot swings through underneath, out of sight below
        pilot.position.y = -0.95 - 1.2 * end;
        pilot.position.z = 0.25 + 1.4 * end;
        pilot.material.rotation = -0.05 * Math.sin(time * 0.9 - 1.2) * calm;
      }
      wing.update(time, 1);
      placeLines();
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
      wing.dispose();
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
