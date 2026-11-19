import type { Metadata } from "next";
import { Camp } from "@/features/camp/Camp";
import { EntryDemo } from "@/features/entry/EntryDemo";

export const metadata: Metadata = { title: "Vibers Club" };

/** ARPIT's experiment (2026-11-20): the meadow door opens onto the sunset camp, with no paraglider, on
 * ARPIT's bluer-sky camp picture. */
export default function CampExperimentPage() {
  return (
    <>
      <Camp glider={false} picture="blue" />
      <EntryDemo />
    </>
  );
}
