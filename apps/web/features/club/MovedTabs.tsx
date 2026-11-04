"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Community } from "./Community";

/** where the old Home tabs (?tab=) live now */
const MOVED: Record<string, string> = {
  community: "/discover",
  events: "/events",
  explore: "/explore",
  itinerary: "/explore?section=itinerary",
};

/** Sends a saved link to an old Home tab to its new page (what was typed at the door goes along). */
export function MovedTabs() {
  const params = useSearchParams();
  const router = useRouter();
  const to = MOVED[params.get("tab") ?? ""];
  const vibe = params.get("vibe") ?? "";
  useEffect(() => {
    if (to) router.replace(to === "/discover" && vibe ? `${to}?vibe=${encodeURIComponent(vibe)}` : to);
  }, [to, vibe, router]);
  return null;
}

/** Community on Discover, ranked by what was typed at the door (?vibe=) when the journey brought us */
export function CommunityFromDoor() {
  const vibe = (useSearchParams().get("vibe") ?? "").slice(0, 200);
  return <Community vibe={vibe} />;
}
