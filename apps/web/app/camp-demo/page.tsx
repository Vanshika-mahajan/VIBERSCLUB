import type { Metadata } from "next";
import { Camp } from "@/features/camp/Camp";
import { EntryDemo } from "@/features/entry/EntryDemo";

export const metadata: Metadata = { title: "Vibers Club" };

/** Review address for what the door opens to: ARPIT's sunset camp, built up step by step. */
export default function CampDemoPage() {
  return (
    <>
      <Camp />
      <EntryDemo />
    </>
  );
}
