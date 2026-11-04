import { discover } from "@/features/discover/rank";
import { hashtag, interpret } from "@/features/discover/interpret";
import { sampleVibers } from "@/features/discover/sample-data";
import type { Viber } from "@/features/discover/types";
import { areas, interestById } from "@/lib/taxonomy";

/**
 * Mock matching for the first page (milestone 9). The thought is read by the same rules as Discover
 * (interpret), ranked over the sample roster (discover), and shaped into what a card shows. Everyone
 * here is fictional sample data; the real API replaces the pool later.
 */

export type JourneyCard = {
  id: string;
  name: string;
  photoUrl?: string;
  photoPosition?: string;
  initials: string;
  /** one line about them */
  intro: string;
  role: string;
  /** what they share with the thought, labelled; empty when they are a suggestion */
  shared: string[];
  hashtags: string[];
  /** "Local, Old Manali" or "Visiting, Vashisht" */
  status: string;
  /** "Here 12–19 Nov" for visitors, "Around all season" for locals */
  dates: string;
  local: boolean;
  /** why they are here, one sentence */
  reason: string;
};

/** A few travellers only the first page uses, so a thought with no clear interests still finds people. */
const extra: Viber[] = [
  {
    id: "aarav-malhotra",
    name: "Aarav Malhotra",
    role: "Weekend trekker",
    area: "old_manali",
    status: "visiting",
    interests: ["day_hikes", "photography", "cafe_hopping", "bonfire_nights"],
    intents: ["activity_buddy", "travel_companion"],
    bio: "Delhi on weekdays, trails on weekends. Looking for people who start early and stop for chai.",
    sample: true,
  },
  {
    id: "zoya-khan",
    name: "Zoya Khan",
    role: "Slow traveller",
    area: "vashisht",
    status: "visiting",
    interests: [
      "slow_travel",
      "hot_springs",
      "writing_and_journaling",
      "cafe_hopping",
    ],
    intents: ["just_exploring", "meet_locals"],
    bio: "Three weeks, no plan. I journal by the hot springs and say yes to good conversations.",
    sample: true,
  },
];
const travellers = extra.filter((v) =>
  v.interests.every((i) => i in interestById),
);

const pool = [...travellers, ...sampleVibers];
/** who greets a thought we can't read yet */
const featured = [
  "aarav-malhotra",
  "meera-kapoor",
  "zoya-khan",
  "lena-fischer",
  "rohan-chauhan",
  "tara-sen",
];

/**
 * Broad words a first thought often uses that Discover's taxonomy leaves to the person to narrow.
 * On the first page we read them generously: each adds the interests it usually means.
 */
const BROAD: [RegExp, string][] = [
  [/\badventur/i, "paragliding treks rafting"],
  [/\bmountains?\b|\bpeaks?\b|\bhimalaya/i, "treks hikes snow"],
  [
    /\blike a local\b|\blocals?\b|\bhidden\b|\boffbeat\b/i,
    "meeting locals village life",
  ],
  [/\bparty|\bnight ?life|\bdanc/i, "clubbing live music"],
  [/\bpeace|\bcalm|\bquiet|\bslow\b/i, "slow travel yoga"],
  [/\bfood|\beat\b|\btaste/i, "himachali food street food"],
  [/\bwork|\bremote\b|\blaptop/i, "workation coworking"],
  [/\bcreative|\bart\b|\bmusic/i, "art jamming"],
  [/\bnature|\bforest|\bwild/i, "forest walks camping"],
  [/\bspontaneous|\bexplor|\bwander/i, "solo travel day hikes"],
];

export function widen(text: string) {
  const extra = BROAD.filter(([re]) => re.test(text)).map(([, add]) => add);
  return extra.length ? `${text}. ${extra.join(". ")}` : text;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function seed(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Sample stay dates, stable per person: starting within the next two weeks, 4 to 10 days long. */
function stay(id: string, today: Date) {
  const s = seed(id);
  const from = new Date(today);
  from.setDate(from.getDate() + (s % 14));
  const to = new Date(from);
  to.setDate(to.getDate() + 4 + ((s >>> 4) % 7));
  const day = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return from.getMonth() === to.getMonth()
    ? `Here ${from.getDate()}–${day(to)}`
    : `Here ${day(from)} – ${day(to)}`;
}

function toCard(
  v: Viber,
  shared: string[],
  reason: string,
  today: Date,
): JourneyCard {
  const local = v.status === "local";
  return {
    id: v.id,
    name: v.name.split(" ")[0],
    photoUrl: v.photoUrl,
    photoPosition: v.photoPosition,
    initials: v.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2),
    intro: v.bio,
    role: v.role,
    shared,
    hashtags: v.interests
      .slice(0, 3)
      .map((i) => hashtag(interestById[i].label)),
    status: `${local ? "Local" : "Visiting"}, ${areas[v.area].label}`,
    dates: local ? "Around all season" : stay(v.id, today),
    local,
    reason,
  };
}

/** The Vibers a thought brings up: up to `count`, best first, topped up with featured people. */
export function matchThought(
  text: string,
  count = 6,
  today = new Date(),
): JourneyCard[] {
  const thought = interpret(widen(text));
  const { matches } = discover(thought, pool, count);
  const cards = matches.map((m) =>
    toCard(
      m.viber,
      m.shared,
      m.reasons[0] ?? "You might see Manali the same way.",
      today,
    ),
  );
  for (const id of featured) {
    if (cards.length >= count) break;
    if (cards.some((c) => c.id === id)) continue;
    const v = pool.find((x) => x.id === id);
    if (v)
      cards.push(
        toCard(v, [], "New to Manali too, and open to meeting people.", today),
      );
  }
  return cards.slice(0, count);
}
