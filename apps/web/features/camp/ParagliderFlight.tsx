"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { canUse3D } from "@/features/journey/world/support";
import { handover, preloadHome } from "./handover";

/**
 * ARPIT's own paraglider (their code and pilot picture, 2026-11-20), flying over the camp experiment.
 * Their scene is kept as they wrote it: the striped canopy, the suspension lines, the pilot sprite and
 * the three phases (descend from high, fly straight at us, accelerate until the canopy covers the
 * screen). Here it draws on a transparent canvas over the camp instead of over its own background,
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
    const canopyWidth = 6.0;
    const canopyHeight = 2.4;

    // MAIN CANOPY SHAPE
    const canopyShape = new THREE.Shape();
    canopyShape.moveTo(-canopyWidth / 2, 0);
    canopyShape.quadraticCurveTo(
      -canopyWidth * 0.27,
      canopyHeight,
      0,
      canopyHeight * 1.05,
    );
    canopyShape.quadraticCurveTo(
      canopyWidth * 0.27,
      canopyHeight,
      canopyWidth / 2,
      0,
    );
    canopyShape.quadraticCurveTo(canopyWidth * 0.25, 0.32, 0, 0.12);
    canopyShape.quadraticCurveTo(
      -canopyWidth * 0.25,
      0.32,
      -canopyWidth / 2,
      0,
    );
    canopy.add(
      new THREE.Mesh(
        new THREE.ShapeGeometry(canopyShape, 64),
        new THREE.MeshBasicMaterial({
          color: 0xf47b20,
          side: THREE.DoubleSide,
        }),
      ),
    );

    // CANOPY PANELS
    const colors = [
      0xd9471e, 0xf39a17, 0xffc94a, 0xe64e25, 0xf28a20, 0xffc94a, 0xd9471e,
    ];
    const panelWidth = canopyWidth / colors.length;
    const topY = (x: number) => {
      const n = Math.abs(x / (canopyWidth / 2));
      return canopyHeight * (0.08 + 0.92 * (1 - Math.pow(n, 1.6)));
    };
    const bottomY = (x: number) => {
      const n = Math.abs(x / (canopyWidth / 2));
      return 0.12 * (1 - Math.pow(n, 1.5));
    };
    for (let i = 0; i < colors.length; i++) {
      const left = -canopyWidth / 2 + i * panelWidth;
      const right = left + panelWidth;
      const panel = new THREE.Shape();
      panel.moveTo(left, bottomY(left));
      for (let j = 1; j <= 20; j++) {
        const x = THREE.MathUtils.lerp(left, right, j / 20);
        panel.lineTo(x, bottomY(x));
      }
      panel.lineTo(right, topY(right));
      for (let j = 1; j <= 20; j++) {
        const x = THREE.MathUtils.lerp(right, left, j / 20);
        panel.lineTo(x, topY(x));
      }
      panel.closePath();
      const mesh = new THREE.Mesh(
        new THREE.ShapeGeometry(panel, 24),
        new THREE.MeshBasicMaterial({
          color: colors[i],
          side: THREE.DoubleSide,
        }),
      );
      mesh.position.z = 0.02;
      canopy.add(mesh);
    }
    canopy.position.set(0, 0.35, 0);

    // PILOT: ARPIT's PNG as a sprite
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
    });

    // SUSPENSION LINES
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.6,
    });
    for (const x of [-2.2, -1.1, 0, 1.1, 2.2]) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.35, 0.04),
        new THREE.Vector3(0, -0.8, 0.04),
      ]);
      paraglider.add(new THREE.Line(geometry, lineMaterial));
    }

    // FLIGHT SETTINGS (ARPIT's values)
    const flightY = -2;
    const flightStartY = 8;
    const start = new THREE.Vector3(0, flightStartY, -50);
    const cameraApproach = new THREE.Vector3(0, flightY, 7.0);
    // (one change to ARPIT's values: at the very end it dips a little lower, -2.6 instead of -2, so the
    // canopy covers the whole screen; at -2 the lower part of the screen still showed the camp)
    const impactPosition = new THREE.Vector3(0, -2.6, 9.35);
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
          THREE.MathUtils.lerp(flightY, impactPosition.y, eased),
          THREE.MathUtils.lerp(cameraApproach.z, impactPosition.z, eased),
        );
        paraglider.scale.setScalar(THREE.MathUtils.lerp(0.72, 4.5, eased));
      }
      paraglider.rotation.set(0, 0, 0);
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
