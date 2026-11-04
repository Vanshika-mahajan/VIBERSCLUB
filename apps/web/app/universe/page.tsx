import type { Metadata } from "next";
import { UniverseScreen } from "@/features/universe/UniverseScreen";

export const metadata: Metadata = { title: "Universe" };

/** The app's home: the full-screen discovery universe. */
export default function UniversePage() {
  return <UniverseScreen />;
}
