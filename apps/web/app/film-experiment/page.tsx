import type { Metadata } from "next";
import { PaintedIntro } from "@/features/film/PaintedIntro";

export const metadata: Metadata = { title: "Vibers Club" };

/** ARPIT's experiment: the painted door (same knife strokes as the camp, 2026-11-20) opens onto the interactive painted intro (connect with Vibers nearby, then the paraglider into Home), with Skip intro. The earlier films stay in `SilkscreenIntro`. `/` is unchanged. */
export default function FilmExperimentPage() {
  return <PaintedIntro paintedDoor />;
}
