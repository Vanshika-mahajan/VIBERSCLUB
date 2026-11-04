import type { Metadata } from "next";
import { Suspense } from "react";
import { ClubHome } from "@/features/club/ClubHome";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  // the open tab is read from the URL, which needs a Suspense boundary for static rendering
  return (
    <Suspense>
      <ClubHome />
    </Suspense>
  );
}
