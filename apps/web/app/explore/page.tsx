import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreHub } from "@/features/explore/ExploreHub";

export const metadata: Metadata = { title: "Explore Manali" };

export default function ExplorePage() {
  // the open section is read from the URL, which needs a Suspense boundary for static rendering
  return (
    <Suspense>
      <ExploreHub />
    </Suspense>
  );
}
