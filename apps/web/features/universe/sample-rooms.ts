import type { Thought } from "@/features/discover/types";

/**
 * Collective rooms for the home universe demo: conversations that were already happening.
 * Everything is FICTIONAL sample content by sample Vibers. Rooms are demo-only; real rooms, with
 * moderation, reporting and a backend model, are phase 2 (decision 2026-10-26).
 */
const pexels = (id: number, w = 480) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export type RoomMessage = { id: string; authorId: string; text: string; minutesAgo: number; photoUrl?: string; photoAlt?: string };

export type Room = {
  id: string;
  title: string;
  blurb: string;
  /** what the room is about; a thought that shares these opens it */
  interests: string[];
  /** members beyond the sample Vibers shown (the room feels lived in, but we never invent faces) */
  memberCount: number;
  memberIds: string[];
  messages: RoomMessage[];
  sample: true;
};

type Msg = [author: string, text: string, minutesAgo: number, photo?: number, alt?: string];

const room = (id: string, title: string, blurb: string, interests: string, memberCount: number, memberIds: string, msgs: Msg[]): Room => ({
  id,
  title,
  blurb,
  interests: interests.split(","),
  memberCount,
  memberIds: memberIds.split(","),
  messages: msgs
    .map(([authorId, text, minutesAgo, photo, alt], i) => ({ id: `${id}-${i}`, authorId, text, minutesAgo, photoUrl: photo ? pexels(photo) : undefined, photoAlt: alt }))
    .sort((a, b) => b.minutesAgo - a.minutesAgo),
  sample: true,
});

export const sampleRooms: Room[] = [
  room("lens", "Manali through a lens", "Photographers swapping light, spots and walks.", "photography,sunrise_and_sunset,content_creation,art_and_sketching", 48,
    "meera-kapoor,lena-fischer,ayesha-rahman,sana-qureshi,maya-iyer,freya-lindqvist", [
      ["meera-kapoor", "Anyone up for Lamadugh at golden hour tomorrow? Clouds are forecast to break around 5.", 95],
      ["lena-fischer", "In. I'll bring the 85 mm. Last time the meadow went pink for about four minutes.", 88],
      ["ayesha-rahman", "Shot this from the bridge this morning. The river was steaming.", 61, 10807657, "Mist over the river at dawn"],
      ["sana-qureshi", "Reminder for the portrait walk: ask first, show them the frame, offer to send it. Every time.", 47],
      ["maya-iyer", "Naggar castle at 7 am is empty and golden. Posting the reel tonight.", 30, 20436785, "Naggar castle terrace in morning light"],
      ["meera-kapoor", "Meeting at Old Manali bridge at 4:30 for Lamadugh. Head torches for the way down.", 9],
    ]),
  room("trail", "Trail talk: Hampta and beyond", "Treks, gear and finding people to walk with.", "multi_day_treks,day_hikes,camping,snow_and_glaciers,forest_walks,waterfalls", 63,
    "tashi,jiya-kohli,harish-negi,pema,freya-lindqvist", [
      ["tashi", "Hampta group leaves Thursday 7 am from the bridge. Two seats left.", 180],
      ["jiya-kohli", "Is Jogini muddy after last night's rain?", 120],
      ["pema", "A little near the top. Proper shoes and you're fine.", 112],
      ["harish-negi", "Snow line is down to 3,000 m above Solang this week.", 70, 6206543, "Snow on the Solang meadows"],
      ["tashi", "Gear list for Thursday: layers, a bag rated to minus ten, and patience at the river crossing.", 25],
    ]),
  room("cafes", "The Old Manali café table", "Cafés, bakeries and long slow afternoons.", "cafe_hopping,coffee_culture,bakeries_and_desserts,slow_travel,writing_and_journaling", 37,
    "nima-sherpa,rina-thapa,noa-levi,kavya-anand", [
      ["nima-sherpa", "Café crawl starts at 3 at the Slow Pine. We end wherever the cardamom buns are.", 140],
      ["rina-thapa", "Roasting on Sunday, come smell it. Book swap on Thursday.", 90, 18995452, "Coffee and a book on a café table"],
      ["noa-levi", "Writing circle in the corner table at 4. Shy people very welcome.", 40],
      ["kavya-anand", "Solo travellers, I'm at the bridge café till 6 if anyone wants chai.", 12],
    ]),
  room("music", "Riverside jams and live music", "Gigs, open jams and bonfire songs, no clubbing needed.", "live_music,music_jamming,open_mic,bonfire_nights", 29,
    "kiran,tenzin,rohan-chauhan", [
      ["kiran", "Two guitars and a cajón tonight by the river. Singers please.", 160],
      ["rohan-chauhan", "Acoustic set at the roastery on Saturday, 7 pm, free.", 75],
      ["tenzin", "Bonfire's lit. Bring a story and a warm layer.", 15, 10807657, "A bonfire by the river at night"],
    ]),
  room("work", "Workation valley", "Wifi that works, coworking and founders passing through.", "workation,coworking,reliable_wifi,nomad_meetups", 41,
    "kabir-anand,noa-levi,rina-thapa", [
      ["kabir-anand", "Apple Barn hit 80 Mbps this morning. Window table faces Rohtang.", 200, 3874620, "A laptop at a window with mountains outside"],
      ["kabir-anand", "Founders dinner on Friday. No pitching allowed, only stories.", 90],
      ["noa-levi", "Anyone want a no-phones focus block tomorrow, 9 to 12?", 35],
    ]),
  room("slow", "Vashisht slow mornings", "Yoga, hot springs and quiet starts.", "yoga,meditation,hot_springs,digital_detox,spiritual_retreats", 34,
    "pema,noa-levi,sana-qureshi", [
      ["pema", "Dawn yoga at 6:30, mats provided. Springs after.", 130, 317155, "Steam rising over the hot springs"],
      ["noa-levi", "Digital detox week starts Monday. Journals encouraged.", 80],
      ["sana-qureshi", "The springs are quietest just before 8.", 22],
    ]),
];

/** the room that fits a thought best: share of the room's interests the thought names, ties to the busier room */
export function roomFor(thought: Thought, rooms: Room[] = sampleRooms): Room | null {
  let best: { room: Room; score: number } | null = null;
  for (const r of rooms) {
    const shared = thought.interests.filter((i) => r.interests.includes(i)).length;
    if (!shared) continue;
    const score = shared + r.memberCount / 1000;
    if (!best || score > best.score) best = { room: r, score };
  }
  return best?.room ?? null;
}
