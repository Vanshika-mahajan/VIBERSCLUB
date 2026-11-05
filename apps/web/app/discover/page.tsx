import type { Metadata } from "next";
import { Suspense } from "react";
import s from "@/features/club/club.module.css";
import { CommunityFromDoor } from "@/features/club/MovedTabs";
import { DiscoverScreen } from "@/features/discover/DiscoverScreen";
import { DiscoverWheel } from "@/features/discover/DiscoverWheel";

export const metadata: Metadata = { title: "Discover Vibers" };

/** The thought sphere first, then the community gallery; a small wheel names both. */
export default function DiscoverPage() {
  return (
    <>
      <h1 className="sr-only">Discover Vibers</h1>
      <DiscoverScreen />
      <DiscoverWheel />
      <section id="community" aria-label="Community" className={`${s.club} ${s.night} scroll-mt-6 pt-10`}>
        <Suspense>
          <CommunityFromDoor />
        </Suspense>
      </section>
    </>
  );
}
