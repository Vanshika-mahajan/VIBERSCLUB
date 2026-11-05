"use client";

import { useEffect } from "react";
import { playSound, type SoundName } from "@/lib/sound";

/**
 * Plays the app's sounds by convention, so most components need nothing:
 * - `data-sound="post"` (any SoundName) on an element plays that sound when it is clicked;
 * - the pill bar's links play "nav";
 * - a toggle (`aria-pressed`) plays "select" when turning on and "deselect" when turning off;
 * - something that expands (`aria-expanded`) plays "open" or "close";
 * - a submit button or a `.btn` plays "tap";
 * - any `<dialog>` opening or closing plays "open" or "close".
 * Changes that happen without a click (a drop, a menu choice) call `playSound` themselves.
 */
export function SoundEffects() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>("[data-sound], a, button, [role='button'], [role='option']");
      if (!el || el.matches(":disabled, [aria-disabled='true']")) return;
      const named = el.closest<HTMLElement>("[data-sound]")?.dataset.sound;
      let sound: SoundName | null = null;
      if (named === "none") return;
      if (named) sound = named as SoundName;
      else if (el.closest(".vc-contents") && el.matches("a")) sound = "nav";
      else if (el.hasAttribute("aria-pressed")) sound = el.getAttribute("aria-pressed") === "true" ? "deselect" : "select";
      else if (el.hasAttribute("aria-expanded")) sound = el.getAttribute("aria-expanded") === "true" ? "close" : "open";
      else if (el.matches("button[type='submit'], .btn, .btn-ghost")) sound = "tap";
      if (sound) playSound(sound);
    };
    document.addEventListener("click", onClick, { capture: true });

    // every dialog in the app, opened or closed in any way (button, Escape, backdrop)
    const watch = new MutationObserver((records) => {
      for (const r of records) {
        if (!(r.target instanceof HTMLDialogElement)) continue;
        const nowOpen = r.target.hasAttribute("open");
        if (nowOpen !== (r.oldValue !== null)) playSound(nowOpen ? "open" : "close");
      }
    });
    watch.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"], attributeOldValue: true });

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      watch.disconnect();
    };
  }, []);
  return null;
}
