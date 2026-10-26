import { actions, getState } from "@/lib/demo/store";
import { interpret } from "./interpret";
import { discover } from "./rank";
import { sampleVibers, sampleWorld } from "./sample-data";
import type { Corrections, DiscoveryResult, SwipeAction, Viber, WorldCard } from "./types";

/**
 * Where Discover gets its data. The screen only talks to this interface, so M5 swaps the sample
 * adapter for one that calls `POST /discovery/query` and `POST /discovery/swipes` without
 * touching the UI.
 */
export interface DiscoveryAdapter {
  /** people and cards for the idle sphere (already eligible for this viewer) */
  universe(): Promise<{ vibers: Viber[]; world: WorldCard[] }>;
  query(text: string, corrections: Corrections, screen: number): Promise<DiscoveryResult>;
  swipe(viberId: string, action: SwipeAction): Promise<{ mutual: boolean }>;
}

/** The demo adapter: sample people, with swipes recorded in the demo store (lib/demo/store.ts).
 * Like the API will, it leaves out anyone you blocked, and a like is mutual when they already liked you. */
export function createSampleAdapter(pool: Viber[] = sampleVibers, world: WorldCard[] = sampleWorld): DiscoveryAdapter {
  const eligible = () => {
    const blocked = getState().blocked;
    return pool.filter((v) => !blocked.includes(v.id));
  };
  return {
    async universe() {
      return { vibers: eligible(), world };
    },
    async query(text, corrections, screen) {
      return discover(interpret(text, corrections), eligible(), screen);
    },
    async swipe(id, action) {
      if (action === "like") return actions.like(id);
      if (action === "pass") actions.pass(id);
      else if (getState().saved.includes(id) !== (action === "save")) actions.toggleSave(id);
      return { mutual: false };
    },
  };
}
