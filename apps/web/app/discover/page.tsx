import type { Metadata } from "next";
import { Suspense } from "react";
import s from "@/features/club/club.module.css";
import { CommunityFromDoor } from "@/features/club/MovedTabs";
import { DiscoverScreen } from "@/features/discover/DiscoverScreen";

export const metadata: Metadata = { title: "Discover Vibers" };

/** The thought sphere first, then the community gallery. */
export default function DiscoverPage() {
  return (
    <>
      <h1 className="sr-only">Discover Vibers</h1>
      <DiscoverScreen />
      <section id="community" aria-label="Community" className={`${s.club} scroll-mt-6 pt-10`}>
        <Suspense>
          <CommunityFromDoor />
        </Suspense>
      </section>
    </>
  );
}
