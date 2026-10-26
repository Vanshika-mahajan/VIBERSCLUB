import type { Metadata } from "next";
import { ExploreScreen } from "@/features/explore/ExploreScreen";

export const metadata: Metadata = { title: "Explore Manali" };

export default function ExplorePage() {
  return <ExploreScreen />;
}
