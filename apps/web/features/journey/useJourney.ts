"use client";

import { useCallback, useState } from "react";

/**
 * The journey's phases, in order. React state changes only at these boundaries;
 * everything in between is GSAP timelines (added milestone by milestone).
 */
export const PHASES = [
  "idle",
  "opening",
  "cosmos",
  "manali",
  "arrive",
] as const;
export type Phase = (typeof PHASES)[number];

export type Journey = {
  phase: Phase;
  thought: string;
  /** Starts the journey with what the person typed. Ignored once it has started. */
  submit: (thought: string) => void;
  /** Moves to a later phase; called by the timelines when a scene ends. Never goes backwards. */
  advance: (to: Phase) => void;
};

/** The director: owns the phase and the thought. Later milestones add the master timeline here. */
export function useJourney(): Journey {
  const [phase, setPhase] = useState<Phase>("idle");
  const [thought, setThought] = useState("");

  const submit = useCallback((text: string) => {
    const clean = text.trim().replace(/\s+/g, " ");
    if (!clean) return;
    setThought(clean);
    setPhase((p) => (p === "idle" ? "opening" : p));
  }, []);

  const advance = useCallback((to: Phase) => {
    setPhase((p) => (PHASES.indexOf(to) > PHASES.indexOf(p) ? to : p));
  }, []);

  return { phase, thought, submit, advance };
}
