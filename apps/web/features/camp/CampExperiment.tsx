import { Camp } from "./Camp";
import { ParagliderFlight } from "./ParagliderFlight";
import { EntryDemo } from "@/features/entry/EntryDemo";

/**
 * ARPIT's experiment (2026-11-20): the meadow door opens onto the camp on ARPIT's bluer-sky picture,
 * with depth, then ARPIT's own paraglider (their code) flies in and its canopy opens Home.
 */
export function CampExperiment() {
  return (
    <>
      <Camp glider={false} picture="blue" />
      <ParagliderFlight />
      <EntryDemo through />
    </>
  );
}
