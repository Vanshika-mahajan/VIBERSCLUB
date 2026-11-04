import type { Metadata } from "next";
import { Suspense } from "react";
import { ClubHome } from "@/features/club/ClubHome";
import { MovedTabs } from "@/features/club/MovedTabs";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <>
      {/* reads the URL (old ?tab= links), which needs a Suspense boundary for static rendering */}
      <Suspense>
        <MovedTabs />
      </Suspense>
      <ClubHome />
    </>
  );
}
