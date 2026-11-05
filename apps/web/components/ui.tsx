"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

/** an image that failed before React hydrated never fires onError, so check it on attach too */
const checkBroken = (fail: () => void) => (el: HTMLImageElement | null) => {
  if (el?.complete && el.naturalWidth === 0) fail();
};
import { initials } from "@/features/discover/sphere";

/** A person's photo, or their initials when there is none or it fails to load. */
export function Avatar({ name, src, size = 44, className = "" }: { name: string; src?: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-surface bg-accent-wash font-semibold text-ink2 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden="true"
    >
      {initials(name)}
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- sample photos from a CDN; real photos come from Storage in M2
        <img src={src.replace(/w=\d+/, `w=${size * 2}`)} alt="" className="absolute inset-0 h-full w-full object-cover" ref={checkBroken(() => setFailed(true))} onError={() => setFailed(true)} />
      )}
    </span>
  );
}

/** A cover photo with a flat sand ground underneath, so a missing photo still looks intended. */
export function Cover({ src, className = "", children }: { src?: string; className?: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-sand ${className}`}>
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- sample photos from a CDN
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" ref={checkBroken(() => setFailed(true))} onError={() => setFailed(true)} />
      )}
      {children}
    </div>
  );
}

export function SampleBadge() {
  return <span className="inline-flex h-5 items-center rounded-full bg-mist px-2 text-[0.62rem] font-semibold tracking-[0.08em] text-on-forest uppercase">Sample</span>;
}

/** A page opening, like a magazine section front: a spaced label, a large Syne title, a hairline under it. */
export function PageHeader({ kicker, title, children }: { kicker?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-10">
      {kicker && <p className="kicker mb-4">{kicker}</p>}
      <h1 className="display text-[2.6rem] leading-[0.92] md:text-[4.6rem]">{title}</h1>
      {children && <div className="mt-4 max-w-xl text-ink2">{children}</div>}
    </header>
  );
}

/**
 * A section of a page: a full-width espresso hairline, then the title in Syne. Give it `n` ("01") for an
 * oversized sage section number beside the title; `quiet` sets the title as a small spaced label instead.
 */
export function Section({ title, action, n, quiet, children }: { title: string; action?: ReactNode; n?: string; quiet?: boolean; children: ReactNode }) {
  return (
    <section className={quiet ? "mt-10 border-t border-line2 pt-3" : "mt-16 border-t border-ink pt-4 md:mt-20"}>
      <div className={`flex items-end justify-between gap-4 ${quiet ? "mb-3" : "mb-6 md:mb-8"}`}>
        <div className="flex min-w-0 items-end gap-4 md:gap-6">
          {n && (
            <span aria-hidden="true" className="font-display text-[3.4rem] leading-[0.78] font-bold tracking-[-0.05em] text-sage-num md:text-[6rem]">
              {n}
            </span>
          )}
          <h2 className={quiet ? "kicker" : "font-display text-[1.7rem] leading-[0.95] font-bold tracking-[-0.025em] text-ink md:text-[2.4rem]"}>{title}</h2>
        </div>
        {action && <div className="shrink-0 pb-1">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[2px] border border-dashed border-line2 p-8 text-center text-muted">{children}</div>;
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-silver transition peer-checked:bg-brand peer-focus-visible:ring-3 peer-focus-visible:ring-focus/40 after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

/* ---------- toasts ---------- */
type Toast = { id: number; text: string };
let toasts: Toast[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function toast(text: string) {
  const id = Date.now() + Math.random();
  toasts = [...toasts.slice(-2), { id, text }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3800);
}

const empty: Toast[] = [];
export function Toaster() {
  const list = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => toasts,
    () => empty,
  );
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto grid w-[min(520px,92vw)] gap-2 md:bottom-6">
      {list.map((t) => (
        <div key={t.id} className="rounded-[2px] bg-brand px-4 py-3 text-sm font-medium text-on-cta">
          {t.text}
        </div>
      ))}
    </div>
  );
}
