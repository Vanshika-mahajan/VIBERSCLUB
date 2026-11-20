import { CampExperiment } from "@/features/camp/CampExperiment";

/**
 * The first page. For ARPIT's experiment (2026-11-20: "just for the experiment sake replace earth with
 * the camp part") the door opens onto the camp, and ARPIT's paraglider opens Home (features/camp).
 * Checkpoint 8, the door opening onto the Earth, is one line away: render <DoorToEarth /> from
 * "@/features/earth/DoorToEarth" here instead. Home is at /home.
 */
export default function FirstPage() {
  return <CampExperiment />;
}
