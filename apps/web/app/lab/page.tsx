import type { Metadata } from "next";
import { MotionLab } from "@/features/lab/MotionLab";

export const metadata: Metadata = { title: "Motion lab", robots: { index: false } };

/** A test bench for the motion building blocks. Not linked from the site. */
export default function LabPage() {
  return <MotionLab />;
}
