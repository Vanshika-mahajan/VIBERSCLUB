/**
 * Home's tabs, in the order of the contents (I to VII). Each chapter after Your vibe opens on one of
 * ARPIT's clips, looping behind its title; the poster is the clip's first second, for the "more in the
 * club" tiles and for reduced motion.
 */
export const homeTabs = [
  { id: "your-vibe", label: "Your vibe", n: "I", poster: "/home/scene.webp" },
  { id: "vibers-like-you", label: "Vibers like you", n: "II", video: "/home/sections/vibers-like-you.mp4", poster: "/home/sections/vibers-like-you.webp" },
  { id: "this-week", label: "This week", n: "III", video: "/home/sections/this-week.mp4", poster: "/home/sections/this-week.webp" },
  { id: "day-plans", label: "Day plans", n: "IV", video: "/home/sections/day-plans.mp4", poster: "/home/sections/day-plans.webp" },
  { id: "discover", label: "Discover", n: "V", video: "/home/sections/discover.mp4", poster: "/home/sections/discover.webp" },
  { id: "events", label: "Events", n: "VI", video: "/home/sections/events.mp4", poster: "/home/sections/events.webp" },
  { id: "explore", label: "Explore", n: "VII", video: "/home/sections/explore.mp4", poster: "/home/sections/explore.webp" },
] as const;

export type HomeTabId = (typeof homeTabs)[number]["id"];

export const isHomeTab = (id: string): id is HomeTabId => homeTabs.some((t) => t.id === id);

/** asks Home's tabs to open a chapter (the contents send it) */
export const OPEN_TAB = "vc:open-tab";
