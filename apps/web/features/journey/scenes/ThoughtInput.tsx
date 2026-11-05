"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { gsap } from "@/lib/motion/gsap";
import s from "../journey.module.css";

type Props = {
  /** true once the journey has started: the text stays visible but can no longer change */
  locked: boolean;
  onSubmit: (thought: string) => void;
};

/**
 * "What's on your mind?" A single line resting on the meadow, not a form box.
 * Empty submit: a small shake and a hint. Real submit: the underline fills with gold and the arrow nudges,
 * then the thought is handed to the director.
 */
export function ThoughtInput({ locked, onSubmit }: Props) {
  const id = useId();
  const field = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");

  /** a small physical response, skipped with reduced motion */
  const nudge = (selector: string, xs: number[], duration: number) => {
    const el = field.current?.parentElement?.querySelector(selector);
    if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.to(el, { keyframes: { x: xs }, duration, ease: "power2.out" });
    }
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (!value.trim()) {
      setHint("Write a few words first: a place, a mood, a kind of people.");
      nudge("input", [0, -8, 7, -4, 2, 0], 0.45);
      field.current?.querySelector("input")?.focus();
      return;
    }
    setHint("");
    nudge("[data-arrow]", [0, 10, 0], 0.6);
    onSubmit(value);
  }

  return (
    <form
      className={s.thought}
      onSubmit={submit}
      data-locked={locked || undefined}
      noValidate
    >
      <label htmlFor={id} className={s.ask}>
        What&rsquo;s on your mind?
      </label>
      <div ref={field} className={s.field}>
        <input
          id={id}
          name="thought"
          className={s.input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (hint) setHint("");
          }}
          placeholder="Tell us what kind of experience you're looking for…"
          autoComplete="off"
          enterKeyHint="go"
          maxLength={200}
          readOnly={locked}
          aria-describedby={`${id}-hint`}
          aria-invalid={hint ? true : undefined}
        />
        <span className={s.underline} aria-hidden="true" />
      </div>
      <div className={s.actions}>
        <p id={`${id}-hint`} className={s.hint} aria-live="polite">
          {hint}
        </p>
        <button type="submit" className={s.cta} disabled={locked}>
          Let&rsquo;s find your vibe
          <span data-arrow aria-hidden="true" className={s.arrow}>
            &rarr;
          </span>
        </button>
      </div>
    </form>
  );
}
