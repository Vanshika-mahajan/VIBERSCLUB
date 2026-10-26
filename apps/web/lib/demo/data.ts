import type { AreaId, IntentId } from "@/lib/taxonomy";

/**
 * Sample world for the pitch demo. Everything is FICTIONAL and labelled "Sample" in the UI.
 * Each milestone replaces one part with the real API: profiles (M2), events (M7), places (M8), chats (M6).
 * Hosts are sample Vibers from features/discover/sample-data.ts.
 */
const pexels = (id: number, w = 640) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export type DemoEvent = {
  id: string;
  title: string;
  hostId: string;
  area: AreaId;
  /** public meeting point (venues are public; people's locations never are) */
  meetingPoint: string;
  /** days from today, and local start time */
  dayOffset: number;
  time: string;
  durationHours: number;
  interests: string[];
  capacity: number;
  /** sample Vibers already going */
  goingIds: string[];
  /** 0 = free. Paid events: the organizer collects payment directly (ADR-0009) */
  priceInr: number;
  description: string;
  photoUrl?: string;
  sample: boolean;
};

export const events: DemoEvent[] = [
  {
    id: "sunrise-jogini",
    title: "Sunrise walk to Jogini falls",
    hostId: "jiya-kohli",
    area: "vashisht",
    meetingPoint: "Vashisht temple square",
    dayOffset: 1,
    time: "05:30",
    durationHours: 3,
    interests: ["sunrise_and_sunset", "day_hikes", "waterfalls"],
    capacity: 10,
    goingIds: ["kavya-anand", "pema", "tenzin", "sana-qureshi"],
    priceInr: 0,
    description: "An easy climb in the blue hour to the falls. Bring a head torch and something warm; we have chai at the top.",
    photoUrl: pexels(23022528),
    sample: true,
  },
  {
    id: "hampta-pass",
    title: "Hampta Pass, 4 days",
    hostId: "tashi",
    area: "old_manali",
    meetingPoint: "Old Manali bridge",
    dayOffset: 4,
    time: "07:00",
    durationHours: 96,
    interests: ["multi_day_treks", "camping", "snow_and_glaciers"],
    capacity: 8,
    goingIds: ["pema", "arya", "reva", "tenzin", "noor", "ari", "meera-kapoor", "jiya-kohli"],
    priceInr: 9500,
    description: "Small-group crossing from Jobra to Chatru with two camps. Tents, meals and a permit included. Moderate fitness needed.",
    photoUrl: pexels(32261647),
    sample: true,
  },
  {
    id: "riverside-bonfire",
    title: "Riverside bonfire and songs",
    hostId: "kiran",
    area: "kullu_valley",
    meetingPoint: "Kasol riverside café",
    dayOffset: 2,
    time: "19:00",
    durationHours: 3,
    interests: ["bonfire_nights", "music_jamming", "river_side_chill"],
    capacity: 20,
    goingIds: ["sahil", "noa-levi", "reva", "rina-thapa", "kabir-anand"],
    priceInr: 0,
    description: "Bring an instrument, a song or just an appetite. Fire, chai and people who'd rather sing than scroll.",
    photoUrl: pexels(10807657),
    sample: true,
  },
  {
    id: "techno-pines",
    title: "Techno in the pines",
    hostId: "vayu",
    area: "old_manali",
    meetingPoint: "Pinewood stage, Old Manali",
    dayOffset: 5,
    time: "21:00",
    durationHours: 6,
    interests: ["clubbing", "live_music"],
    capacity: 120,
    goingIds: ["tara-sen", "arjun-desai", "nila", "maya-iyer", "kabir-anand"],
    priceInr: 800,
    description: "Warm, hypnotic techno outdoors. Safe ride home list at the gate; no phones on the dance floor, please.",
    photoUrl: pexels(3379257),
    sample: true,
  },
  {
    id: "cafe-crawl",
    title: "Old Manali café crawl",
    hostId: "nima-sherpa",
    area: "old_manali",
    meetingPoint: "The Slow Pine café",
    dayOffset: 0,
    time: "15:00",
    durationHours: 3,
    interests: ["cafe_hopping", "coffee_culture", "bakeries_and_desserts"],
    capacity: 12,
    goingIds: ["freya-lindqvist", "lena-fischer", "alina-petrova"],
    priceInr: 0,
    description: "Four cafés, four styles of coffee, one slow afternoon. Everyone pays for what they order.",
    photoUrl: pexels(18995452),
    sample: true,
  },
  {
    id: "story-circle",
    title: "Sunday story circle",
    hostId: "narayan-joshi",
    area: "mall_road",
    meetingPoint: "Library garden, Mall Road",
    dayOffset: 6,
    time: "11:00",
    durationHours: 2,
    interests: ["meeting_locals", "writing_and_journaling"],
    capacity: 25,
    goingIds: ["pooja-rana", "ayesha-rahman", "freya-lindqvist"],
    priceInr: 0,
    description: "Travellers and locals swap stories. Come with one, or just listen.",
    photoUrl: pexels(18988622),
    sample: true,
  },
  {
    id: "dawn-yoga",
    title: "Dawn yoga above the river",
    hostId: "kavya-anand",
    area: "vashisht",
    meetingPoint: "Vashisht hot spring steps",
    dayOffset: 1,
    time: "06:30",
    durationHours: 1.5,
    interests: ["yoga", "meditation", "hot_springs"],
    capacity: 14,
    goingIds: ["sana-qureshi", "noor"],
    priceInr: 300,
    description: "Gentle flow and breathwork, then a dip in the hot springs for those who want it. Mats provided.",
    photoUrl: pexels(317155),
    sample: true,
  },
  {
    id: "winter-camp",
    title: "Winter camp under the stars",
    hostId: "ari",
    area: "solang",
    meetingPoint: "Solang ropeway car park",
    dayOffset: 9,
    time: "14:00",
    durationHours: 20,
    interests: ["camping", "stargazing", "snow_and_glaciers"],
    capacity: 10,
    goingIds: ["arya", "meera-kapoor"],
    priceInr: 2500,
    description: "One night in warm tents with a firm no-speakers rule. Sleeping bags rated to minus ten.",
    photoUrl: pexels(4381184),
    sample: true,
  },
  {
    id: "orchard-lunch",
    title: "Orchard lunch and apple picking",
    hostId: "saanvi-thakur",
    area: "naggar",
    meetingPoint: "Naggar castle gate",
    dayOffset: 3,
    time: "12:00",
    durationHours: 4,
    interests: ["orchards_and_farms", "himachali_food", "village_life"],
    capacity: 12,
    goingIds: ["ayesha-rahman", "pooja-rana", "kishan-chauhan"],
    priceInr: 600,
    description: "Pick with the family, then a Himachali lunch under the trees: siddu, madra and fresh apple chutney.",
    photoUrl: pexels(28098320),
    sample: true,
  },
  {
    id: "cowork-day",
    title: "Coworking day at the Apple Barn",
    hostId: "dolma",
    area: "vashisht",
    meetingPoint: "The Apple Barn",
    dayOffset: 2,
    time: "10:00",
    durationHours: 7,
    interests: ["coworking", "workation", "reliable_wifi"],
    capacity: 16,
    goingIds: ["naina-kapoor", "alina-petrova", "maya-iyer"],
    priceInr: 0,
    description: "Fast wifi, long tables and a lunch break walk. Pay for what you order.",
    photoUrl: pexels(3874620),
    sample: true,
  },
];

export type PlaceKind = "café" | "trail" | "viewpoint" | "temple" | "hot spring" | "market" | "waterfall";

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  area: AreaId;
  interests: string[];
  blurb: string;
  tip: string;
  photoUrl?: string;
};

export const places: Place[] = [
  { id: "hadimba", name: "Hadimba Devi temple", kind: "temple", area: "mall_road", interests: ["temples_and_heritage", "forest_walks"], blurb: "A 16th-century wooden temple in a deodar forest.", tip: "Go before 9 am; it's quiet and the light comes through the trees.", photoUrl: pexels(28098320) },
  { id: "jogini", name: "Jogini falls", kind: "waterfall", area: "vashisht", interests: ["waterfalls", "day_hikes"], blurb: "A 150 m fall an hour's walk above Vashisht.", tip: "The trail is muddy after rain; wear proper shoes.", photoUrl: pexels(23022528) },
  { id: "vashisht-springs", name: "Vashisht hot springs", kind: "hot spring", area: "vashisht", interests: ["hot_springs", "temples_and_heritage"], blurb: "Public hot-water baths beside the temple.", tip: "Separate baths for men and women; bring a towel.", photoUrl: pexels(317155) },
  { id: "slow-pine", name: "The Slow Pine", kind: "café", area: "old_manali", interests: ["cafe_hopping", "coffee_culture", "writing_and_journaling"], blurb: "Laptops allowed, conversation encouraged.", tip: "The cardamom bun sells out by noon.", photoUrl: pexels(18995452) },
  { id: "apple-barn", name: "The Apple Barn", kind: "café", area: "vashisht", interests: ["coworking", "reliable_wifi", "coffee_culture"], blurb: "A converted barn with the valley's most reliable wifi.", tip: "Ask for the window table facing Rohtang.", photoUrl: pexels(3874620) },
  { id: "manu-temple", name: "Manu temple walk", kind: "temple", area: "old_manali", interests: ["temples_and_heritage", "village_life"], blurb: "Stone lanes up through Old Manali village.", tip: "Look for the carved balconies on the way up.", photoUrl: pexels(20436785) },
  { id: "solang", name: "Solang meadows", kind: "viewpoint", area: "solang", interests: ["snow_and_glaciers", "paragliding", "skiing_and_snowboarding"], blurb: "Wide meadows, snow in winter, paragliders in spring.", tip: "Book paragliding only with licensed operators at the official counter.", photoUrl: pexels(6206543) },
  { id: "naggar-castle", name: "Naggar castle", kind: "viewpoint", area: "naggar", interests: ["temples_and_heritage", "village_life", "slow_travel"], blurb: "Stone-and-timber castle with a view down the valley.", tip: "The café terrace is the best sunset seat in Naggar.", photoUrl: pexels(20436785) },
  { id: "lamadugh", name: "Lamadugh meadow trail", kind: "trail", area: "old_manali", interests: ["day_hikes", "forest_walks", "sunrise_and_sunset"], blurb: "A steady climb through pine to an open meadow.", tip: "Start early and carry water; there's none on the way.", photoUrl: pexels(32261647) },
  { id: "mall-road", name: "Mall Road market", kind: "market", area: "mall_road", interests: ["local_markets", "souvenirs_and_woollens", "street_food"], blurb: "Woollens, momos and the evening crowd.", tip: "The Tibetan market lane has the fairest shawl prices.", photoUrl: pexels(18988622) },
  { id: "kasol-river", name: "Parvati riverside", kind: "viewpoint", area: "kullu_valley", interests: ["river_side_chill", "camping", "bonfire_nights"], blurb: "Pebble beaches and cafés along the Parvati.", tip: "Never swim; the current is stronger than it looks.", photoUrl: pexels(10807657) },
  { id: "jana-falls", name: "Jana falls and village", kind: "waterfall", area: "naggar", interests: ["waterfalls", "himachali_food", "village_life"], blurb: "A village fall with dhabas serving local food.", tip: "Try the siddu with ghee at the stalls by the fall.", photoUrl: pexels(4381184) },
];

export type Roadmap = { id: string; title: string; summary: string; stops: { placeId: string; time: string; note: string }[] };

export const roadmaps: Roadmap[] = [
  {
    id: "old-manali-slow",
    title: "A slow day in Old Manali",
    summary: "Temples, lanes and two good cafés, all on foot.",
    stops: [
      { placeId: "manu-temple", time: "09:00", note: "Walk up through the village" },
      { placeId: "slow-pine", time: "11:00", note: "Coffee and a bun" },
      { placeId: "lamadugh", time: "14:00", note: "Short climb if you still have legs" },
    ],
  },
  {
    id: "vashisht-wellness",
    title: "Vashisht wellness morning",
    summary: "Waterfall, hot springs and a long breakfast.",
    stops: [
      { placeId: "jogini", time: "06:00", note: "Walk to the falls" },
      { placeId: "vashisht-springs", time: "09:00", note: "Soak" },
      { placeId: "apple-barn", time: "10:30", note: "Breakfast with a view" },
    ],
  },
  {
    id: "naggar-heritage",
    title: "Naggar heritage loop",
    summary: "A castle, a waterfall village and Himachali food.",
    stops: [
      { placeId: "naggar-castle", time: "10:00", note: "Castle and museum" },
      { placeId: "jana-falls", time: "13:00", note: "Lunch at the falls" },
    ],
  },
];

export type ChatMessage = { id: string; from: "me" | "them"; text: string; minutesAgo: number };

/** sample Vibers who already liked you: liking them back makes a mutual match */
export const likedMe = ["meera-kapoor", "tenzin", "freya-lindqvist", "kavya-anand", "harish-negi"];

export const seedConnections: Record<string, "connected" | "incoming"> = {
  tashi: "connected",
  "nima-sherpa": "connected",
  "pooja-rana": "incoming",
  "kabir-anand": "incoming",
};

export const seedMessages: Record<string, ChatMessage[]> = {
  tashi: [
    { id: "t1", from: "them", text: "Hey! Saw you liked Hampta. We have two seats left for this week.", minutesAgo: 180 },
    { id: "t2", from: "me", text: "Amazing. How cold does it get at the top camp?", minutesAgo: 175 },
    { id: "t3", from: "them", text: "Around minus five at night. We give you a bag rated to minus ten, so you'll be fine.", minutesAgo: 170 },
  ],
  "nima-sherpa": [
    { id: "n1", from: "them", text: "Welcome to Old Manali! The café crawl starts at 3 if you want to join.", minutesAgo: 60 * 26 },
  ],
};

export type Me = {
  name: string;
  area: AreaId;
  status: "visiting" | "local";
  dateFrom: string;
  dateTo: string;
  vibe: string;
  interests: string[];
  intents: IntentId[];
  privacy: { discoverable: boolean; womenOnly: boolean; showDates: boolean };
};

export const seedMe: Me = {
  name: "Riya",
  area: "old_manali",
  status: "visiting",
  dateFrom: "",
  dateTo: "",
  vibe: "Here for a week. Looking for people to trek with, slow cafés and a bonfire or two. No clubbing.",
  interests: ["multi_day_treks", "cafe_hopping", "bonfire_nights", "sunrise_and_sunset"],
  intents: ["activity_buddy", "join_events"],
  privacy: { discoverable: true, womenOnly: false, showDates: true },
};
