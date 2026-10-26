/**
 * Interest taxonomy v1 (docs/AI_MATCHING_DESIGN.md section 2): 10 categories, 62 interests.
 * Ids are stable; labels can change. The API will serve this from `data/seed/taxonomy.yaml`;
 * until then the website keeps this copy. Synonyms feed the rules-first reading of a thought.
 */

export type Hue = "blue" | "violet" | "cyan";

export type Category = { id: string; label: string; hue: Hue };

export type Interest = {
  id: string;
  label: string;
  category: string;
  /** lower-case words or phrases that mean this interest (English, Hinglish) */
  synonyms: string[];
};

export const categories: Category[] = [
  { id: "nature", label: "Nature and trekking", hue: "cyan" },
  { id: "culture", label: "Local culture", hue: "violet" },
  { id: "food", label: "Food and cafés", hue: "blue" },
  { id: "social", label: "Nightlife and social", hue: "violet" },
  { id: "adventure", label: "Adventure", hue: "cyan" },
  { id: "wellness", label: "Wellness", hue: "blue" },
  { id: "work", label: "Work and travel", hue: "blue" },
  { id: "creative", label: "Creative", hue: "violet" },
  { id: "markets", label: "Shopping and markets", hue: "blue" },
  { id: "style", label: "Ways of travelling", hue: "cyan" },
];

const i = (id: string, label: string, category: string, synonyms: string[] = []): Interest => ({
  id,
  label,
  category,
  synonyms,
});

export const interests: Interest[] = [
  i("day_hikes", "Day hikes", "nature", ["hike", "hiking", "walk", "walks", "trail", "trails", "jogini", "lamadugh"]),
  i("multi_day_treks", "Treks", "nature", ["trek", "treks", "trekking", "hampta", "beas kund", "bhrigu", "backpacking trail"]),
  i("waterfalls", "Waterfalls", "nature", ["waterfall", "waterfalls", "falls"]),
  i("forest_walks", "Forest walks", "nature", ["forest", "forests", "deodar", "woods", "pine"]),
  i("snow_and_glaciers", "Snow", "nature", ["snow", "glacier", "glaciers", "snowfall", "winter", "rohtang"]),
  i("camping", "Camping", "nature", ["camp", "camping", "tent", "tents", "campsite"]),
  i("stargazing", "Stargazing", "nature", ["stars", "stargazing", "astro", "night sky", "milky way"]),
  i("sunrise_and_sunset", "Sunrise", "nature", ["sunrise", "sunset", "golden hour", "first light", "blue hour"]),
  i("river_side_chill", "Riverside", "nature", ["river", "riverside", "beas", "parvati"]),

  i("village_life", "Village life", "culture", ["village", "villages", "gaon", "rural"]),
  i("temples_and_heritage", "Temples", "culture", ["temple", "temples", "hadimba", "heritage", "mandir"]),
  i("monasteries", "Monasteries", "culture", ["monastery", "monasteries", "gompa", "buddhist"]),
  i("local_festivals", "Festivals", "culture", ["festival", "festivals", "dussehra", "mela"]),
  i("homestay_living", "Homestays", "culture", ["homestay", "homestays"]),
  i("orchards_and_farms", "Orchards", "culture", ["orchard", "orchards", "apple", "apples", "farm", "farms"]),
  i("local_crafts", "Local crafts", "culture", ["craft", "crafts", "weaving", "shawl weaving", "handloom"]),
  i("meeting_locals", "Meeting locals", "culture", ["locals", "local people", "pahadi"]),
  i("slow_travel", "Slow travel", "culture", ["slow", "slow travel", "unhurried", "no rush"]),

  i("cafe_hopping", "Cafés", "food", ["cafe", "cafes", "café", "cafés", "cafe hopping"]),
  i("himachali_food", "Himachali food", "food", ["himachali", "siddu", "dham", "trout", "local food"]),
  i("street_food", "Street food", "food", ["street food", "momos", "maggi"]),
  i("bakeries_and_desserts", "Bakeries", "food", ["bakery", "bakeries", "dessert", "desserts", "cake"]),
  i("vegetarian_and_vegan", "Veg and vegan", "food", ["vegan", "vegetarian", "veg"]),
  i("cooking_together", "Cooking together", "food", ["cook", "cooking", "recipe"]),
  i("coffee_culture", "Coffee", "food", ["coffee", "espresso", "roast", "roastery", "barista"]),

  i("clubbing", "Clubbing", "social", ["club", "clubbing", "party", "parties", "rave", "techno", "dj", "electronic", "psytrance"]),
  i("bonfire_nights", "Bonfires", "social", ["bonfire", "bonfires", "campfire"]),
  i("live_music", "Live music", "social", ["live music", "gig", "gigs", "concert", "jazz", "band"]),
  i("open_mic", "Open mic", "social", ["open mic", "poetry", "standup", "stand-up"]),
  i("hostel_socials", "Hostel socials", "social", ["hostel", "hostels", "hostel party"]),
  i("board_and_card_games", "Board games", "social", ["board game", "board games", "cards", "card games", "chess"]),
  i("pub_evenings", "Pubs", "social", ["pub", "pubs", "beer", "drinks", "bar"]),

  i("paragliding", "Paragliding", "adventure", ["paraglide", "paragliding", "bir"]),
  i("river_rafting", "Rafting", "adventure", ["rafting", "raft"]),
  i("skiing_and_snowboarding", "Skiing", "adventure", ["ski", "skiing", "snowboard", "snowboarding"]),
  i("mountain_biking", "Cycling", "adventure", ["cycle", "cycling", "mtb", "mountain bike", "bicycle", "gravel"]),
  i("rock_climbing", "Climbing", "adventure", ["climb", "climbing", "bouldering"]),
  i("motorbike_road_trips", "Road trips", "adventure", ["bike trip", "road trip", "ride", "riding", "motorbike", "royal enfield", "spiti", "leh"]),
  i("off_road_drives", "Off-road", "adventure", ["off road", "offroad", "4x4", "jeep"]),

  i("yoga", "Yoga", "wellness", ["yoga", "asana"]),
  i("meditation", "Meditation", "wellness", ["meditate", "meditation", "mindfulness", "breathwork"]),
  i("hot_springs", "Hot springs", "wellness", ["hot spring", "hot springs", "vashisht bath"]),
  i("digital_detox", "Digital detox", "wellness", ["detox", "offline", "no phone", "disconnect"]),
  i("spiritual_retreats", "Retreats", "wellness", ["retreat", "retreats", "spiritual", "satsang"]),

  i("workation", "Workation", "work", ["workation", "remote work", "work remotely", "laptop", "wfh"]),
  i("coworking", "Coworking", "work", ["cowork", "coworking", "co-working"]),
  i("nomad_meetups", "Nomad meetups", "work", ["nomad", "nomads", "digital nomad", "founders", "startup", "startups"]),
  i("reliable_wifi", "Good wifi", "work", ["wifi", "wi-fi", "internet"]),

  i("photography", "Photography", "creative", ["photo", "photos", "photography", "camera", "shoot", "film camera"]),
  i("music_jamming", "Jamming", "creative", ["jam", "jamming", "guitar", "singing", "music"]),
  i("art_and_sketching", "Art", "creative", ["art", "sketch", "sketching", "painting", "draw", "drawing"]),
  i("writing_and_journaling", "Writing", "creative", ["write", "writing", "journal", "journaling", "poems"]),
  i("content_creation", "Content creation", "creative", ["content", "reels", "vlog", "youtube", "creator"]),

  i("local_markets", "Local markets", "markets", ["market", "markets", "mall road", "bazaar"]),
  i("souvenirs_and_woollens", "Woollens", "markets", ["woollen", "woollens", "shawl", "shawls", "souvenir", "souvenirs"]),
  i("flea_and_thrift", "Flea markets", "markets", ["flea", "thrift", "vintage"]),

  i("solo_travel", "Solo travel", "style", ["solo", "alone", "by myself", "solo trip"]),
  i("budget_backpacking", "Backpacking", "style", ["budget", "backpacking", "backpacker", "cheap"]),
  i("luxury_stays", "Luxury stays", "style", ["luxury", "resort", "boutique"]),
  i("pet_friendly", "Pet friendly", "style", ["dog", "dogs", "pet", "pets"]),
  i("family_friendly", "Family friendly", "style", ["family", "kids", "parents"]),
  i("accessible_travel", "Accessible travel", "style", ["accessible", "wheelchair", "step-free"]),
];

export const interestById: Record<string, Interest> = Object.fromEntries(interests.map((x) => [x.id, x]));

export const hueOf = (interestId: string): Hue =>
  categories.find((c) => c.id === interestById[interestId]?.category)?.hue ?? "blue";

/** what the Viber is looking for (fixed list) */
export const intents = {
  travel_companion: { label: "Travel companion", synonyms: ["travel buddy", "companion", "travel partner", "someone to travel", "join me", "go together"] },
  activity_buddy: { label: "Activity buddy", synonyms: ["buddy", "buddies", "people to", "someone to", "partner for", "group for", "looking for people"] },
  meet_locals: { label: "Meet locals", synonyms: ["meet locals", "local friends", "locals"] },
  local_recommendations: { label: "Recommendations", synonyms: ["recommend", "suggestions", "tips", "where to", "best place"] },
  join_events: { label: "Join events", synonyms: ["event", "events", "meetup", "meetups", "what's happening", "tonight"] },
  host_events: { label: "Host events", synonyms: ["host", "hosting", "organise", "organize", "run a"] },
  workation_buddies: { label: "Workation buddies", synonyms: ["work buddies", "cowork together", "work together"] },
  just_exploring: { label: "Just exploring", synonyms: ["explore", "exploring", "wander", "see manali", "discover"] },
} as const;

export type IntentId = keyof typeof intents;

/** named areas (ADR-0006); never precise locations */
export const areas = {
  old_manali: { label: "Old Manali", synonyms: ["old manali"] },
  vashisht: { label: "Vashisht", synonyms: ["vashisht", "vashist"] },
  mall_road: { label: "Mall Road", synonyms: ["mall road", "model town", "manali town"] },
  aleo_prini: { label: "Aleo and Prini", synonyms: ["aleo", "prini"] },
  jagatsukh: { label: "Jagatsukh", synonyms: ["jagatsukh"] },
  solang: { label: "Solang and Palchan", synonyms: ["solang", "palchan"] },
  naggar: { label: "Naggar", synonyms: ["naggar"] },
  kullu_valley: { label: "Kullu valley", synonyms: ["kullu", "kasol", "tosh", "parvati valley", "jibhi"] },
} as const;

export type AreaId = keyof typeof areas;
