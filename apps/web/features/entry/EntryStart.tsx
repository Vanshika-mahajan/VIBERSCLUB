"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { canUse3D } from "@/features/journey/world/support";
import { entryHandoff } from "./handoff";
import s from "./entry.module.css";

/**
 * The first page. It shows the door's sky for a moment and moves on to /home, raising the hand-over
 * flag where the door can run, so the door lies over the real Home from its first frame. Without
 * WebGL, or with reduced motion, it goes straight to Home.
 */
export function EntryStart() {
  const router = useRouter();
  useEffect(() => {
    if (canUse3D()) entryHandoff.start();
    router.replace("/home");
  }, [router]);
  return <div className={s.entry} aria-hidden="true" />;
}
