import type { Metadata } from "next";
import { IntroExperience } from "@/features/intro/IntroExperience";

export const metadata: Metadata = {
  title: "Entry demo",
  robots: { index: false },
};

/** The new entry experience, for review before it replaces the first page. Not linked from the site. */
export default function IntroDemoPage() {
  return <IntroExperience />;
}
