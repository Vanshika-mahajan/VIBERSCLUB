"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { SectionWheel, type WheelSection } from "@/components/SectionWheel";
import { Explore } from "@/features/club/Explore";
import { Itinerary } from "@/features/club/Itinerary";
import s from "@/features/club/club.module.css";
import { DayPlans } from "./DayPlans";

const SECTIONS = [
  { id: "explore", label: "Explore" },
  { id: "itinerary", label: "Itinerary" },
] as const;
export type ExploreSection = (typeof SECTIONS)[number]["id"];

/** the parts of the Explore half, named on the wheel so it is clear there is more below */
const PARTS: WheelSection[] = [
  { label: "Places to visit", id: "places" },
  { label: "Posts like yours", id: "posts-like-yours" },
  { label: "Day plans", id: "day-plans" },
];

/**
 * Explore Manali in two halves: Explore (places, day plans, posts like yours) and Itinerary
 * (plans to start from and my own). The open half is kept in the URL (?section=itinerary).
 */
export function ExploreHub({ inline = false }: { inline?: boolean }) {
  const asked = useSearchParams().get("section");
  const [section, setSection] = useState<ExploreSection>(asked === "itinerary" ? "itinerary" : "explore");
  // a day plan opened to customize: the Itinerary half opens with it in the builder
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const choose = (id: ExploreSection) => {
    setSection(id);
    // on its own page the open half is kept in the URL; as a chapter of Home it is not
    if (inline) return;
    const url = id === "explore" ? "/explore" : `/explore?section=${id}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <div className={`${s.club} ${s.issue}`}>
      {!inline && (
        <PageHeader kicker="Explore" title="Explore Manali">
          Places worth the walk, day plans by locals, and your own itinerary.
        </PageHeader>
      )}
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
            {/* on Home the contents name the parts, and day plans are chapter IV */}
            {!inline && <SectionWheel sections={PARTS} label="Parts of Explore" layout="inline" className="vc-explore-wheel--inline" />}
            {!inline && <SectionWheel sections={PARTS} label="Parts of Explore" className="vc-explore-wheel--side" />}
            <Explore />
            {!inline && (
              <DayPlans
                onCustomize={(id) => {
                  setOpenPlan(id);
                  choose("itinerary");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </>
        ) : (
          <Itinerary initialOpen={openPlan} />
        )}
      </div>
    </div>
  );
}
