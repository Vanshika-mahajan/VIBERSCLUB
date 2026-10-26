import type { AreaId, IntentId } from "@/lib/taxonomy";

/** A Viber as Discover sees them: only fields the person has made visible. */
export type Viber = {
  id: string;
  name: string;
  role: string;
  area: AreaId;
  status: "local" | "visiting";
  interests: string[];
  intents: IntentId[];
  bio: string;
  photoUrl?: string;
  /** focal point for cropping the photo, CSS object-position */
  photoPosition?: string;
  /** true for the labelled demo roster */
  sample: boolean;
};

/** A decorative card on the sphere (events and places). Not interactive in the MVP. */
export type WorldCard = { id: string; title: string; kind: "event" | "place"; photoUrl?: string };

/** What the person changed by hand; their edits always win over what was read from the text. */
export type Corrections = { added: string[]; removed: string[] };

export type Chip =
  | { kind: "interest"; id: string; label: string; why: string; source: "text" | "added" }
  | { kind: "area"; id: AreaId; label: string; why: string; source: "text" }
  | { kind: "not"; id: string; label: string; why: string };

export type Suggestion = { id: string; label: string; why: string };

/** The structured reading of a thought (mirrors VibeExtraction in AI_MATCHING_DESIGN). */
export type Thought = {
  text: string;
  interests: string[];
  excluded: string[];
  intents: IntentId[];
  area: AreaId | null;
  chips: Chip[];
  suggestions: Suggestion[];
  removed: Suggestion[];
  confidence: "high" | "medium" | "low";
  /** human-readable lines for "Why these?" */
  explanation: string[];
};

export type Match = {
  viber: Viber;
  /** labels of what they share with the thought, for the card label */
  shared: string[];
  /** template sentences from visible fields only, strongest first */
  reasons: string[];
  /** internal ordering only; never shown as a percentage */
  score: number;
};

/** "Narrow it down": the thought's main interest paired with one its matches often share. */
export type Pathway = { add: string; title: string; count: number; members: Viber[] };

export type DiscoveryResult = {
  thought: Thought;
  /** every eligible match, best first */
  matches: Match[];
  pathways: Pathway[];
};

export type SwipeAction = "like" | "pass" | "save" | "unsave";
