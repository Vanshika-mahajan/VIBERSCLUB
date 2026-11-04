import type { AreaId } from "@/lib/taxonomy";

/**
 * Sample content for the club home: posts by Vibers and day plans Vibers have shared. FICTIONAL and
 * labelled "Sample" in the UI. Posts (M9) and shared itineraries (M8) come from the API later.
 */
const pexels = (id: number, w = 720) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export type Post = {
  id: string;
  /** a sample Viber's id, or "me" */
  authorId: string;
  text: string;
  placeId?: string;
  area?: AreaId;
  photoUrl?: string;
  /** minutes ago, for "2 h ago" */
  minutesAgo: number;
  sample: boolean;
};

export const samplePosts: Post[] = [
  {
    id: "p-jogini-dawn",
    authorId: "jiya-kohli",
    text: "Made it to Jogini before sunrise. Mist on the falls, chai at the top. Going again Thursday if anyone wants to walk up together.",
    placeId: "jogini",
    area: "vashisht",
    photoUrl: pexels(23022528),
    minutesAgo: 95,
    sample: true,
  },
  {
    id: "p-cafe-crawl",
    authorId: "nima-sherpa",
    text: "Slow café crawl in Old Manali this afternoon: The Slow Pine, then the bakery by Manu temple. Laptops welcome, conversation more so.",
    placeId: "slow-pine",
    area: "old_manali",
    photoUrl: pexels(18995452),
    minutesAgo: 60 * 3,
    sample: true,
  },
  {
    id: "p-hampta",
    authorId: "tashi",
    text: "Two seats left on our Hampta Pass trek this week. Four days, small group, gear included. Looking for steady walkers who like quiet camps.",
    area: "old_manali",
    photoUrl: pexels(32261647),
    minutesAgo: 60 * 5,
    sample: true,
  },
  {
    id: "p-bonfire",
    authorId: "freya-lindqvist",
    text: "Bonfire by the Parvati tonight. Bring a song, a story or just yourself. No loud music, promise.",
    placeId: "kasol-river",
    area: "kullu_valley",
    photoUrl: pexels(10807657),
    minutesAgo: 60 * 8,
    sample: true,
  },
  {
    id: "p-hot-springs",
    authorId: "sana-qureshi",
    text: "Vashisht hot springs at 7 am are a different world. Photographed the bathers' faces in the steam; will share the set next week.",
    placeId: "vashisht-springs",
    area: "vashisht",
    photoUrl: pexels(317155),
    minutesAgo: 60 * 12,
    sample: true,
  },
  {
    id: "p-naggar",
    authorId: "harish-negi",
    text: "Naggar castle terrace at sunset, then siddu at Jana falls. Best slow day in the valley if you're tired of crowds.",
    placeId: "naggar-castle",
    area: "naggar",
    photoUrl: pexels(20436785),
    minutesAgo: 60 * 20,
    sample: true,
  },
  {
    id: "p-coworking",
    authorId: "kavya-anand",
    text: "Working from The Apple Barn all week. Reliable wifi, Rohtang out of the window. Happy to share a table and lunch with other remote folks.",
    placeId: "apple-barn",
    area: "vashisht",
    photoUrl: pexels(3874620),
    minutesAgo: 60 * 26,
    sample: true,
  },
  {
    id: "p-solang",
    authorId: "meera-kapoor",
    text: "First paraglide over Solang today. Booked at the official counter as everyone advised. Terrified, then completely calm.",
    placeId: "solang",
    area: "solang",
    photoUrl: pexels(6206543),
    minutesAgo: 60 * 30,
    sample: true,
  },
];

/** a place on a day: when, what you'll do there, and a note */
export type Stop = { id: string; placeId: string; time: string; note: string; activity?: string };
export type ItineraryDay = { id: string; stops: Stop[] };
export type Visibility = "public" | "private";
export const TRAVEL_STYLES = [
  "Easy pace",
  "Slow travel",
  "Early riser",
  "On foot",
  "Adventure",
  "Food and culture",
  "Workation",
] as const;
export type Itinerary = {
  id: string;
  title: string;
  /** the description */
  summary: string;
  /** "club" = made by Vibers Club; a Viber's id; or "me" */
  by: string;
  days: ItineraryDay[];
  sample: boolean;
  /** public plans can be found and copied by other Vibers; mine start private */
  visibility?: Visibility;
  /** the first day, yyyy-mm-dd, when the dates are known (otherwise the plan is just a duration) */
  startDate?: string;
  travelStyle?: string;
  notes?: string;
};

const plan = (
  id: string,
  title: string,
  summary: string,
  by: string,
  travelStyle: string,
  days: [string, string, string][][],
): Itinerary => ({
  id,
  title,
  summary,
  by,
  travelStyle,
  visibility: "public",
  sample: true,
  days: days.map((stops, d) => ({
    id: `${id}-d${d + 1}`,
    stops: stops.map(([placeId, time, note], s) => ({
      id: `${id}-d${d + 1}-${s}`,
      placeId,
      time,
      note,
    })),
  })),
});

/** Day plans made by Vibers Club */
export const clubTemplates: Itinerary[] = [
  plan(
    "club-first-two-days",
    "Your first two days",
    "The essentials, at an easy pace: temples, cafés and the hot springs.",
    "club",
    "Easy pace",
    [
      [
        ["hadimba", "08:30", "Before the crowds"],
        ["manu-temple", "10:30", "Walk up through Old Manali"],
        ["slow-pine", "12:30", "Lunch and a long coffee"],
      ],
      [
        ["jogini", "06:30", "Walk to the falls"],
        ["vashisht-springs", "09:30", "Soak"],
        ["mall-road", "18:00", "Momos and woollens"],
      ],
    ],
  ),
  plan(
    "club-slow-valley",
    "The slow valley",
    "Three unhurried days down the Kullu valley.",
    "club",
    "Slow travel",
    [
      [
        ["naggar-castle", "10:00", "Castle and museum"],
        ["jana-falls", "13:00", "Lunch at the falls"],
      ],
      [["kasol-river", "11:00", "Riverside cafés"]],
      [
        ["lamadugh", "07:00", "Meadow climb"],
        ["slow-pine", "13:00", "Rest your legs"],
      ],
    ],
  ),
];

/** Day plans other Vibers have shared */
export const viberTemplates: Itinerary[] = [
  plan(
    "jiya-sunrise",
    "Sunrise chaser's weekend",
    "Up early both days, rewarded both days.",
    "jiya-kohli",
    "Early riser",
    [
      [
        ["jogini", "05:30", "Falls at first light"],
        ["vashisht-springs", "08:30", "Warm up"],
      ],
      [
        ["lamadugh", "05:00", "Sunrise from the meadow"],
        ["apple-barn", "10:00", "Breakfast"],
      ],
    ],
  ),
  plan(
    "nima-cafes",
    "Old Manali on foot",
    "Lanes, cafés and the people who run them.",
    "nima-sherpa",
    "On foot",
    [
      [
        ["manu-temple", "10:00", "Temple and the carved balconies"],
        ["slow-pine", "12:00", "Cardamom bun before it sells out"],
        ["mall-road", "17:00", "Tibetan market lane"],
      ],
    ],
  ),
  plan(
    "harish-heritage",
    "Heritage and siddu",
    "A local's day of old stone and good food.",
    "harish-negi",
    "Food and culture",
    [
      [
        ["naggar-castle", "09:30", "Castle terrace"],
        ["jana-falls", "12:30", "Siddu with ghee"],
        ["hadimba", "17:00", "Evening at the temple"],
      ],
    ],
  ),
];
