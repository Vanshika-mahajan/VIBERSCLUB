"use client";

import { SectionWheel, type WheelSection } from "@/components/SectionWheel";

/**
 * A small wheel at the side of Discover naming its two parts, the thought sphere and the gallery
 * below it, so it is clear there is more under the globe.
 */
const SECTIONS: WheelSection[] = [
  { label: "The orbit of thoughts", id: null },
  { label: "Faces waiting below ↓", id: "community" },
];

export function DiscoverWheel() {
  return <SectionWheel sections={SECTIONS} label="Parts of Discover" />;
}
