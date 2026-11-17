import type { Metadata } from "next";
import { Suspense } from "react";
import { ClubHome } from "@/features/club/ClubHome";
import { CanopyReveal } from "@/features/intro/CanopyReveal";
import { EntryOnHome } from "@/features/entry/EntryOnHome";
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
      {/* only when arriving from the entry: its canopy opens onto Home */}
      <CanopyReveal />
      {/* only when arriving through "/": the door in the clouds, opening onto Home */}
      <EntryOnHome />
    </>
  );
}
