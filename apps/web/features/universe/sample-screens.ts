import type { AreaId } from "@/lib/taxonomy";

/**
 * Discussion threads and shared photos that ride the orbits of the home universe.
 * Everything is FICTIONAL sample content written by sample Vibers (features/discover/sample-data.ts),
 * labelled "Sample" in the UI. Collective rooms are a demo-only feature; real rooms, with moderation
 * and reporting, are phase 2 (docs/design/DISCOVERY_DESIGN.md).
 */
const pexels = (id: number, w = 360) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export type Screen = {
  id: string;
  kind: "thread" | "photo";
  /** thread title, or photo caption */
  title: string;
  /** first lines of the latest reply (threads only) */
  snippet?: string;
  /** sample Viber id */
  authorId: string;
  interests: string[];
  area: AreaId;
  replies: number;
  minutesAgo: number;
  photoUrl?: string;
  sample: true;
};

type ThreadRow = [title: string, snippet: string, author: string, interests: string, area: AreaId, replies: number, minutesAgo: number];
type PhotoRow = [caption: string, photo: number, author: string, interests: string, area: AreaId, replies: number, minutesAgo: number];

const threads: ThreadRow[] = [
  ["Golden hour spots above Old Manali?", "Lamadugh meadow at 6 pm, trust me. Bring a long lens.", "meera-kapoor", "photography,sunrise_and_sunset,day_hikes", "old_manali", 23, 12],
  ["Portrait walk through Vashisht, Saturday", "Six of us so far. We always ask before we shoot.", "lena-fischer", "photography,meeting_locals,village_life", "vashisht", 17, 40],
  ["Film or digital for the Hampta trek?", "Digital. Batteries die in the cold, carry two spares.", "ayesha-rahman", "photography,multi_day_treks,snow_and_glaciers", "old_manali", 31, 95],
  ["Hampta Pass group, leaving Thursday", "Two seats left. Gear list is pinned at the top.", "tashi", "multi_day_treks,camping,snow_and_glaciers", "old_manali", 42, 8],
  ["Beginner day hikes that aren't crowded", "Jana falls from Naggar. Quiet even on weekends.", "jiya-kohli", "day_hikes,waterfalls,forest_walks", "naggar", 19, 150],
  ["Sunrise at Jogini, who's in tomorrow?", "Meeting at the temple square at 5:30.", "jiya-kohli", "sunrise_and_sunset,day_hikes,waterfalls", "vashisht", 14, 25],
  ["Best cardamom bun in Old Manali", "The Slow Pine, but go before noon.", "nima-sherpa", "cafe_hopping,bakeries_and_desserts,coffee_culture", "old_manali", 56, 33],
  ["Laptop-friendly cafés with real wifi", "Apple Barn had 80 Mbps this morning.", "kabir-anand", "workation,reliable_wifi,coworking", "vashisht", 38, 70],
  ["Founders in the valley this month", "Small dinner on Friday, no pitching allowed.", "kabir-anand", "nomad_meetups,workation,coworking", "old_manali", 21, 220],
  ["Bonfire by the Beas tonight?", "Bring a story and a warm layer, we have chai.", "tenzin", "bonfire_nights,river_side_chill,music_jamming", "old_manali", 27, 18],
  ["Open jam at the riverside café", "Two guitars and a cajón so far. Singers welcome.", "kiran", "music_jamming,live_music,open_mic", "old_manali", 15, 60],
  ["Live music this weekend, no clubbing", "Acoustic set at the roastery, Saturday 7 pm.", "rohan-chauhan", "live_music,coffee_culture,open_mic", "old_manali", 22, 130],
  ["Dawn yoga circle in Vashisht", "Mats provided. Hot springs after.", "pema", "yoga,meditation,hot_springs", "vashisht", 29, 45],
  ["Digital detox week, anyone?", "No phones from Monday. Journals encouraged.", "noa-levi", "digital_detox,meditation,writing_and_journaling", "naggar", 12, 300],
  ["Paragliding at Solang: which operators?", "Only the licensed counter. Ask to see the card.", "harish-negi", "paragliding,snow_and_glaciers", "solang", 34, 85],
  ["Spiti road trip, sharing fuel", "Two bikes, leaving Monday. One pillion seat.", "rohan-chauhan", "motorbike_road_trips,off_road_drives,camping", "mall_road", 26, 400],
  ["Stargazing above Prini", "New moon on Friday. Milky Way from 10 pm.", "freya-lindqvist", "stargazing,camping,photography", "aleo_prini", 18, 160],
  ["Siddu and dham: where do locals eat?", "The stalls at Jana falls, with ghee.", "kishan-chauhan", "himachali_food,village_life,meeting_locals", "naggar", 33, 110],
  ["Orchard stay during apple season", "Our family farm has two rooms free next week.", "narayan-joshi", "orchards_and_farms,homestay_living,village_life", "naggar", 11, 520],
  ["Sketching club at Hadimba temple", "Pencils and chai, every Sunday morning.", "tara-sen", "art_and_sketching,temples_and_heritage,forest_walks", "mall_road", 16, 240],
  ["Writing circle in a café", "Prompts at 4, readings at 6. Shy people welcome.", "noa-levi", "writing_and_journaling,cafe_hopping,open_mic", "old_manali", 13, 180],
  ["Solo women travellers, meet for chai?", "Old Manali bridge café, Wednesday 5 pm.", "kavya-anand", "solo_travel,cafe_hopping,meeting_locals", "old_manali", 41, 55],
  ["Snow camp at Solang this winter", "We camp at 3,000 m. Sleeping bags to minus ten.", "harish-negi", "camping,snow_and_glaciers,skiing_and_snowboarding", "solang", 20, 600],
  ["Reels in Manali without the crowds", "Shoot Naggar castle at 7 am, empty and golden.", "maya-iyer", "content_creation,photography,temples_and_heritage", "naggar", 24, 90],
];

const photos: PhotoRow[] = [
  ["First light on the Pir Panjal", 23022528, "meera-kapoor", "photography,sunrise_and_sunset,day_hikes", "solang", 48, 20],
  ["Prayer flags at the pass", 32261647, "tashi", "multi_day_treks,photography,snow_and_glaciers", "old_manali", 36, 75],
  ["Riverside fire, last night", 10807657, "tenzin", "bonfire_nights,river_side_chill", "old_manali", 22, 140],
  ["Morning in the café", 18995452, "nima-sherpa", "cafe_hopping,coffee_culture,photography", "old_manali", 31, 50],
  ["Our tents above Solang", 4381184, "harish-negi", "camping,snow_and_glaciers", "solang", 19, 310],
  ["Market lanes at dusk", 18988622, "lena-fischer", "photography,local_markets,street_food", "mall_road", 27, 100],
  ["Steam over the springs", 317155, "pema", "hot_springs,yoga,photography", "vashisht", 15, 260],
  ["Wooden temple in the deodars", 28098320, "ayesha-rahman", "temples_and_heritage,photography,forest_walks", "mall_road", 29, 190],
  ["Window seat facing Rohtang", 3874620, "kabir-anand", "workation,coffee_culture", "vashisht", 12, 65],
  ["Naggar from the castle terrace", 20436785, "maya-iyer", "photography,temples_and_heritage,slow_travel", "naggar", 33, 230],
  ["Meadows after the snow", 6206543, "freya-lindqvist", "snow_and_glaciers,photography,day_hikes", "solang", 26, 380],
  ["Pines and techno", 3379257, "kiran", "clubbing,music_jamming", "old_manali", 17, 420],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const sampleScreens: Screen[] = [
  ...threads.map(([title, snippet, authorId, tags, area, replies, minutesAgo]): Screen => ({
    id: "th-" + slug(title),
    kind: "thread",
    title,
    snippet,
    authorId,
    interests: tags.split(","),
    area,
    replies,
    minutesAgo,
    sample: true,
  })),
  ...photos.map(([title, photo, authorId, tags, area, replies, minutesAgo]): Screen => ({
    id: "ph-" + slug(title),
    kind: "photo",
    title,
    authorId,
    interests: tags.split(","),
    area,
    replies,
    minutesAgo,
    photoUrl: pexels(photo),
    sample: true,
  })),
];
