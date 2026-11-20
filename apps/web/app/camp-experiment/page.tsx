import type { Metadata } from "next";
import { CampExperiment } from "@/features/camp/CampExperiment";

export const metadata: Metadata = { title: "Vibers Club" };

/** ARPIT's camp experiment, also at / for now (see app/page.tsx). */
export default function CampExperimentPage() {
  return <CampExperiment />;
}
