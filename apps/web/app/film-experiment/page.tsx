import type { Metadata } from "next";
import { SilkscreenIntro } from "@/features/film/SilkscreenIntro";

export const metadata: Metadata = { title: "Vibers Club" };

/** ARPIT's experiment: the meadow door opens onto the silkscreen film, with Skip intro, ending on Home. `/` is unchanged. */
export default function FilmExperimentPage() {
  return <SilkscreenIntro />;
}
