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

export function createSampleAdapter(pool: Viber[] = sampleVibers, world: WorldCard[] = sampleWorld): DiscoveryAdapter {
  return {
    async universe() {
      return { vibers: pool, world };
    },
    async query(text, corrections, screen) {
      return discover(interpret(text, corrections), pool, screen);
    },
    async swipe() {
      // sample people never like back, so there is never a mutual match in the demo
      return { mutual: false };
    },
  };
}
