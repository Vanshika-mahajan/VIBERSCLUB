import type { Metadata } from "next";
import { Camp } from "@/features/camp/Camp";
import { EntryDemo } from "@/features/entry/EntryDemo";
import { ParagliderFlight } from "@/features/camp/ParagliderFlight";

export const metadata: Metadata = { title: "Vibers Club" };

/** ARPIT's experiment (2026-11-20): the meadow door opens onto the sunset camp, on ARPIT's bluer-sky
 * camp picture, then ARPIT's own paraglider (their code) flies in and its canopy opens Home. */
export default function CampExperimentPage() {
  return (
    <>
      <Camp glider={false} picture="blue" />
      <ParagliderFlight />
      <EntryDemo />
    </>
  );
}
