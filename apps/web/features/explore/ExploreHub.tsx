"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { Explore } from "@/features/club/Explore";
import { Itinerary } from "@/features/club/Itinerary";
import s from "@/features/club/club.module.css";
import { DayPlans } from "./DayPlans";

const SECTIONS = [
  { id: "explore", label: "Explore" },
  { id: "itinerary", label: "Itinerary" },
] as const;
export type ExploreSection = (typeof SECTIONS)[number]["id"];

/**
 * Explore Manali in two halves: Explore (places, day plans, posts like yours) and Itinerary
 * (plans to start from and my own). The open half is kept in the URL (?section=itinerary).
 */
export function ExploreHub() {
  const asked = useSearchParams().get("section");
  const [section, setSection] = useState<ExploreSection>(asked === "itinerary" ? "itinerary" : "explore");
  const choose = (id: ExploreSection) => {
    setSection(id);
    const url = id === "explore" ? "/explore" : `/explore?section=${id}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <div className={s.club}>
      <PageHeader kicker="Explore" title="Explore Manali">
        Places worth the walk, day plans by locals, and your own itinerary.
      </PageHeader>
      <div className={s.segment} role="group" aria-label="Explore sections">
        {SECTIONS.map((x) => (
          <button key={x.id} type="button" aria-pressed={section === x.id} onClick={() => choose(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      <div key={section} className={s.panel}>
        {section === "explore" ? (
          <>
            <Explore />
            <DayPlans />
          </>
        ) : (
          <Itinerary />
        )}
      </div>
    </div>
  );
}
