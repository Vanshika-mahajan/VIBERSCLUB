import type { Metadata } from "next";
import { HomeTabsDemo } from "@/features/home/tabs/HomeTabsDemo";

export const metadata: Metadata = { title: "Home (tabs demo)", robots: { index: false } };

/** a review copy of Home with tabs after Your vibe; /home stays as it is until ARPIT approves */
export default function HomeDemoPage() {
  return <HomeTabsDemo />;
}
