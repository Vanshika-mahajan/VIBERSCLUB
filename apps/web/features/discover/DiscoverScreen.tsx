"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { areas, hueOf, interestById } from "@/lib/taxonomy";
import { createSampleAdapter, type DiscoveryAdapter } from "./adapter";
import s from "./discover.module.css";
import { Icon } from "./icons";
import { corrections, emptyCorrections, hashtag } from "./interpret";
import { ProfilePanel } from "./ProfilePanel";
import { useCalm } from "./useCalm";
import { Sphere, initials, type Formed, type Slot, type SphereItem } from "./sphere";
import type { Corrections, DiscoveryResult, Viber, WorldCard } from "./types";

const sampleAdapter = createSampleAdapter();

const TRY = [
  "Trek Hampta this weekend",
  "Cafés and sunsets in Old Manali",
  "Live music, no clubbing",
  "Yoga and hot springs in Vashisht",
  "Workation buddies with good wifi",
];
const HUE_COLOR = { blue: "#4F6BFF", violet: "#8B7CFF", cyan: "#35C8E8" } as const;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const first = (v: Viber) => v.name.split(" ")[0];

/** where the formed cards sit: an arch on wide screens, a 3-column grid on phones */
export function formationSlots(n: number, W: number, H: number): Slot[] {
  const narrow = W < 720;
  const shortH = !narrow && H < 760;
  const barTop = (narrow || shortH ? 0.66 : 0.7) * H - (narrow ? 29 : 32);
  const out: Slot[] = [];
  if (narrow) {
    const cols = 3;
    const rows = Math.ceil(n / cols);
    const top = H * 0.22;
    const rowH = (barTop - 16 - top) / Math.max(2, rows);
    const cw = (W - 28) / cols;
    const h = Math.min(rowH - 48, (cw * 0.86) / 0.77, 140);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const off = (cols - Math.min(cols, n - r * cols)) / 2;
      out.push({ x: 14 + (c + off + 0.5) * cw, y: top + (r + 0.5) * rowH - 10, h, rot: (c - 1) * 2.2 });
    }
    return out;
  }
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const hC = clamp(H * 0.2, 112, 190);
  const hE = hC * 0.78;
  const rx = Math.min(W * 0.43, 610);
  const ry = clamp(H * 0.115, 56, 118);
  const edgeY = barTop - 12 - 50 - hE / 2;
  // spread across the width in a shallow arch; slot 0 is the centre, the rest alternate outward
  const xs = [...Array(n)].map((_, j) => (n === 1 ? 0 : (j / (n - 1)) * 2 - 1));
  const squeeze = Math.min(1, 0.34 + 0.11 * n);
  xs.sort((p, q) => Math.abs(p) - Math.abs(q) || q - p).forEach((t) => {
    const f = 1 - t * t * 0.92;
    out.push({ x: W / 2 + t * rx * squeeze, y: edgeY - ry * f, h: hE + (hC - hE) * f, rot: t * 4.5 });
  });
  return out;
}

type Toast = { id: number; text: string };

export function DiscoverScreen({ adapter = sampleAdapter }: { adapter?: DiscoveryAdapter }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sphereRef = useRef<Sphere | null>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());

  const [universe, setUniverse] = useState<{ vibers: Viber[]; world: WorldCard[] } | null>(null);
  const [sphereReady, setSphereReady] = useState(0);
  const [text, setText] = useState("");
  const [corr, setCorr] = useState<Corrections>(emptyCorrections);
  const [latest, setResult] = useState<DiscoveryResult | null>(null);
  const [settled, setSettled] = useState(false);
  const [kb, setKb] = useState(false);
  const [size, setSize] = useState({ W: 1024, H: 768 });
  const [peekId, setPeekId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [calm, setCalm] = useCalm();
  const [paused, setPaused] = useState(false);
  const [tip, setTip] = useState<{ it: SphereItem; x: number; y: number } | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const returnFocus = useRef<HTMLElement | null>(null);

  const narrow = size.W < 720;
  const screen = narrow ? 6 : 7;

  const toast = useCallback((textMsg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text: textMsg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  /* ---------- universe and preferences ---------- */
  useEffect(() => {
    adapter.universe().then(setUniverse);
  }, [adapter]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ W: el.clientWidth, H: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- the sphere (created when shown, disposed when hidden or left) ---------- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !universe) return;
    const sp = new Sphere(cv, {
      reduced: calmRef.current,
      onPick: (it) => pickRef.current(it),
      onHover: (it, p) => setTip(it && p && it.kind !== "world" ? { it, x: p.x, y: p.y } : null),
      onFormed: (list) => placeCards(list),
    });
    const counts = new Map<string, number>();
    universe.vibers.forEach((v) => v.interests.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1)));
    sp.load(
      universe.vibers.map((v) => ({ uid: v.id, title: v.name, photoUrl: v.photoUrl, pos: v.photoPosition })),
      universe.world.map((w) => ({ uid: "w:" + w.id, kind: w.kind, photoUrl: w.photoUrl })),
      [...counts].filter(([, n]) => n >= 2).map(([id]) => ({ id, label: hashtag(interestById[id].label).slice(1), col: HUE_COLOR[hueOf(id)] })),
    );
    sp.start();
    sphereRef.current = sp;
    setSphereReady((n) => n + 1);
    return () => {
      sp.dispose();
      sphereRef.current = null;
    };
  }, [universe]);

  const calmRef = useRef(calm);
  useEffect(() => {
    calmRef.current = calm;
    sphereRef.current?.setReduced(calm);
  }, [calm]);
  useEffect(() => sphereRef.current?.setPaused(paused), [paused, sphereReady]);

  /** formed cards are drawn on the canvas; accessible buttons ride on top of them */
  function placeCards(list: Formed[]) {
    for (const f of list) {
      const el = cardRefs.current.get(f.uid);
      if (!el) continue;
      el.style.width = f.w + "px";
      el.style.height = f.h + "px";
      el.style.transform = `translate(${(f.x - f.w / 2).toFixed(1)}px,${(f.y - f.h / 2).toFixed(1)}px) rotate(${f.rot.toFixed(3)}rad)`;
      el.style.setProperty("--r", f.rot.toFixed(3) + "rad");
      el.style.visibility = "visible";
    }
  }

  /* ---------- typing → understanding → people step out ---------- */
  const active = !!text.trim() || corr.added.length > 0;
  useEffect(() => {
    if (!active) return;
    let live = true;
    const a = setTimeout(() => {
      adapter.query(text, corr, 40).then((r) => live && setResult(r));
    }, 90);
    const b = setTimeout(() => {
      if (!live) return;
      // on a phone the keyboard stays up until Enter
      if (!kbRef.current) setSettled(true);
    }, 720);
    return () => {
      live = false;
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [active, text, corr, adapter]);
  const kbRef = useRef(kb);
  useEffect(() => {
    kbRef.current = kb;
  }, [kb]);

  const result = active ? latest : null;
  const parsing = active && !settled;
  const matches = useMemo(() => (result ? result.matches.filter((m) => !passed.has(m.viber.id)) : []), [result, passed]);
  const searching = !!result && (result.thought.interests.length > 0 || result.thought.area !== null);
  const formedIds = useMemo(() => (settled && searching ? matches.slice(0, screen).map((m) => m.viber.id) : []), [settled, searching, matches, screen]);
  const formed = formedIds.length > 0;

  // glow: what matches the thought shines on the sphere, the rest recedes
  useEffect(() => {
    const sp = sphereRef.current;
    if (!sp) return;
    if (!result || !searching) return sp.setRelevance(null);
    const m = new Map<string, number>();
    matches.forEach((x, i) => m.set(x.viber.id, i < screen ? 1 : 0.6));
    result.thought.interests.forEach((id) => m.set("t:" + id, 1));
    result.thought.suggestions.forEach((x) => m.set("t:" + x.id, 0.35));
    sp.setRelevance(m);
  }, [result, matches, searching, screen, sphereReady]);

  useEffect(() => {
    const sp = sphereRef.current;
    if (!sp) return;
    sp.setFormation(formationSlots(formedIds.length, size.W, size.H));
    sp.extract(formedIds);
  }, [formedIds, size, sphereReady]);

  const settleNow = (e?: FormEvent) => {
    e?.preventDefault();
    setSettled(true);
    if (narrow) inputRef.current?.blur();
  };
  const edit = (fn: (c: Corrections) => Corrections) => {
    setCorr(fn);
    setSettled(true);
  };
  const reset = () => {
    setText("");
    setCorr(emptyCorrections());
    setWhyOpen(false);
    setSettled(false);
  };
  const typeText = (t: string) => {
    setText(t);
    setCorr(emptyCorrections());
    setSettled(true);
  };

  /* ---------- picking on the sphere ---------- */
  const pickRef = useRef<(it: SphereItem) => void>(() => {});
  useEffect(() => {
    pickRef.current = (it) => {
      setTip(null);
      if (it.kind === "person") openPeek(it.e.uid, canvasRef.current);
      else if (it.kind === "tag") {
        if (result?.thought.interests.includes(it.e.id)) return toast(`#${it.e.label} is already in your thought.`);
        edit((c) => corrections.add(c, it.e.id));
        toast(`Added #${it.e.label}.`);
      }
    };
  });

  /* ---------- profile panel, list, dialog ---------- */
  const byId = useMemo(() => new Map((universe?.vibers ?? []).map((v) => [v.id, v])), [universe]);
  function openPeek(id: string, from: HTMLElement | null) {
    returnFocus.current = from ?? (document.activeElement as HTMLElement | null);
    setPeekId(id);
  }
  const closePeek = useCallback(() => {
    setPeekId(null);
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el?.isConnected) el.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (infoOpen) setInfoOpen(false);
      else if (peekId) closePeek();
      else if (listOpen) setListOpen(false);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [infoOpen, peekId, listOpen, closePeek]);

  const peekViber = peekId ? byId.get(peekId) : undefined;
  const peekMatch = peekId ? matches.find((m) => m.viber.id === peekId) : undefined;

  async function like(v: Viber) {
    if (liked.has(v.id)) return;
    setLiked((x) => new Set(x).add(v.id));
    const { mutual } = await adapter.swipe(v.id, "like");
    if (mutual) toast(`You and ${first(v)} like each other. You can send a connection request.`);
    else toast(`You liked ${first(v)}. If they like you back, you can connect.${v.sample ? " (Sample Vibers can't like back.)" : ""}`);
  }
  function pass(v: Viber) {
    setPassed((x) => new Set(x).add(v.id));
    void adapter.swipe(v.id, "pass");
    closePeek();
    toast(`Passed. ${first(v)} won't show up in your results for a while.`);
  }
  function save(v: Viber) {
    const on = !saved.has(v.id);
    setSaved((x) => {
      const n = new Set(x);
      if (on) n.add(v.id);
      else n.delete(v.id);
      return n;
    });
    if (on) void adapter.swipe(v.id, "save");
    toast(on ? `Saved ${first(v)} for later.` : `Removed ${first(v)} from saved.`);
  }

  function toggleCalm() {
    const v = !calm;
    setCalm(v);
    toast(v ? "Calm mode on: the sphere holds still." : "Calm mode off.");
  }

  /* ---------- the line under the chips ---------- */
  function line() {
    if (!text.trim() && !corr.added.length) return <>Say what you&apos;re in the mood for. Your thought is only used to find people.</>;
    if (!result) return <>Reading your thought…</>;
    if (!searching) {
      return (
        <>
          I couldn&apos;t match that to an interest or an area yet. Try{" "}
          {["Trekking", "Cafés", "Live music", "Old Manali"].map((l, i) => (
            <span key={l}>
              {i > 0 && " · "}
              <button type="button" onClick={() => typeText(l)}>
                {l}
              </button>
            </span>
          ))}
        </>
      );
    }
    if (!matches.length) return <>No one here shares all of that yet. Remove a tag above to widen it.</>;
    if (!formed) return <>Reading your thought…</>;
    return (
      <>
        <b>
          {formedIds.length} of {matches.length}
        </b>{" "}
        {universe?.vibers.some((v) => v.sample) ? "sample " : ""}
        {plural(matches.length, "Viber", "Vibers")} who share this thought.{" "}
        <button type="button" onClick={() => setListOpen(true)}>
          {matches.length > formedIds.length ? "See all" : "See as a list"}
        </button>
        {" · "}
        <button type="button" aria-expanded={whyOpen} onClick={() => setWhyOpen((w) => !w)}>
          {whyOpen ? "Hide why" : "Why these?"}
        </button>
        {result.thought.confidence !== "high" && " · Not fully sure. Adjust the tags if I got it wrong."}
      </>
    );
  }

  const t = result?.thought;
  const hasQ = !!text || corr.added.length > 0;

  return (
    <div
      ref={rootRef}
      className={s.root}
      data-formed={formed}
      data-hasq={hasQ}
      data-kb={kb}
      data-list={listOpen}
      data-calm={calm}
    >
      <div className={s.stage}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="A slowly turning sphere of Vibers, events and interests. Everything it shows is also in the list view."
        />
      </div>

      <header className={s.top}>
        <button type="button" className={s.brand} onClick={() => (listOpen ? setListOpen(false) : reset())} aria-label="Discover: back to the sphere">
          <span className={s.mark} aria-hidden="true">
            <i />
            <i />
          </span>
          <span className={s.brandWord}>
            <b>Vibers</b> Discover
          </span>
        </button>
        <span className={s.spacer} />
        <div className={s.ctl} role="group" aria-label="View controls">
          <button type="button" className={s.cb} aria-pressed={listOpen} aria-label="List view" title="List view" onClick={() => setListOpen((v) => !v)}>
            <Icon name="list" />
          </button>
          <button type="button" className={s.cb} aria-pressed={calm} aria-label="Calm mode" title="Calm mode" onClick={toggleCalm}>
            <Icon name="calm" />
          </button>
          <button type="button" className={s.cb} aria-pressed={paused} aria-label={paused ? "Play the sphere" : "Pause the sphere"} title={paused ? "Play" : "Pause"} onClick={() => setPaused((p) => !p)}>
            <Icon name={paused ? "play" : "pause"} />
          </button>
          <button type="button" className={s.cb} aria-label="About Discover" title="About Discover" onClick={() => setInfoOpen(true)}>
            <Icon name="info" />
          </button>
        </div>
      </header>

      <div className={s.hero}>
        <div className={s.intro}>
          <h1>
            Somewhere, someone
            <br />
            is thinking like <span className={s.you}>you.</span>
          </h1>
        </div>
        <div className={s.ask}>
          <form role="search" autoComplete="off" onSubmit={settleNow} data-parsing={parsing}>
            <div className={s.bar}>
              <span className={s.orbit} aria-hidden="true" />
              <svg className={s.ret} viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="14" className={s.r1} />
                <circle cx="20" cy="20" r="7" className={s.r2} />
                <path d="M20 3v6M20 31v6M3 20h6M31 20h6" className={s.tk} />
              </svg>
              <label className={s.sr} htmlFor="thought">
                What&apos;s on your mind?
              </label>
              <input
                ref={inputRef}
                id="thought"
                className={s.input}
                type="text"
                enterKeyHint="search"
                maxLength={280}
                placeholder="What's on your mind?"
                aria-describedby="discover-line"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSettled(false);
                }}
                onFocus={() => narrow && setKb(true)}
                onBlur={() => {
                  setKb(false);
                  if (hasQ) setSettled(true);
                }}
              />
              {hasQ && (
                <button type="button" className={s.clr} aria-label="Clear what I typed" onClick={() => (reset(), inputRef.current?.focus())}>
                  <Icon name="x" />
                </button>
              )}
              <button type="submit" className={s.go} aria-label="Show me who is thinking like this">
                <Icon name="arrow" />
              </button>
              <span className={s.scan} aria-hidden="true" />
            </div>

            <div className={s.read}>
              {t && (
                <ul className={s.chips} aria-label="What I understood">
                  {t.chips.map((c, i) => (
                    <li key={c.kind + c.id} className={`${s.ch} ${c.kind === "not" ? s.not : ""}`} data-h={c.kind === "area" ? "violet" : hueOf(c.id)} style={{ "--i": i } as CSSProperties}>
                      <span className={s.dot} aria-hidden="true" />
                      <span className={s.tx}>
                        {c.kind === "not" && <span className={s.sr}>Not </span>}
                        {hashtag(c.label)}
                      </span>
                      <span className={s.why} aria-hidden="true">
                        {c.why}
                      </span>
                      {c.kind !== "area" && (
                        <button
                          type="button"
                          className={s.x}
                          aria-label={c.kind === "not" ? `Stop ruling out ${hashtag(c.label)}` : `Remove ${hashtag(c.label)}`}
                          onClick={() => edit((x) => corrections.remove(x, c.id))}
                        >
                          <Icon name="x" />
                        </button>
                      )}
                    </li>
                  ))}
                  {t.suggestions.map((sg, i) => (
                    <li key={"s" + sg.id} className={`${s.ch} ${s.sug}`} style={{ "--i": t.chips.length + i } as CSSProperties}>
                      <button
                        type="button"
                        aria-label={`Add ${hashtag(sg.label)}. ${sg.why}`}
                        onClick={() => {
                          edit((x) => corrections.add(x, sg.id));
                          toast(`Added ${hashtag(sg.label)}.`);
                        }}
                      >
                        + {hashtag(sg.label)}
                      </button>
                      <span className={s.why} aria-hidden="true">
                        {sg.why}
                      </span>
                    </li>
                  ))}
                  {t.removed.slice(0, 2).map((r) => (
                    <li key={"r" + r.id} className={`${s.ch} ${s.rm}`}>
                      <button type="button" onClick={() => edit((x) => corrections.restore(x, r.id))}>
                        Bring back {hashtag(r.label)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={s.line} id="discover-line" role="status" aria-live="polite">
                {line()}
              </p>
              {whyOpen && t && (
                <div className={s.whyp}>
                  <b>How I read it</b>
                  <ul>
                    {t.explanation.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                  <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                    Order comes from shared interests, what you hope to do and your area. Only Vibers who can see each other appear, and there are no compatibility scores.
                  </p>
                </div>
              )}
            </div>
          </form>

          {formed && result && result.pathways.length > 0 && (
            <section className={s.paths} aria-label="Narrow it down">
              <p className={s.pcap}>Narrow it down</p>
              <ul className={s.pwrap}>
                {result.pathways.map((p, i) => (
                  <li key={p.add}>
                    <button
                      type="button"
                      className={s.pw}
                      style={{ "--i": i } as CSSProperties}
                      aria-label={`Add ${interestById[p.add].label.toLowerCase()}. ${p.count} ${plural(p.count, "Viber", "Vibers")} who match also like it.`}
                      onClick={() => {
                        edit((x) => corrections.add(x, p.add));
                        toast(`Added ${hashtag(interestById[p.add].label)}.`);
                      }}
                    >
                      <span className={s.avs} aria-hidden="true">
                        {p.members.slice(0, 3).map((m) => (
                          <i key={m.id} className={s.av} style={m.photoUrl ? { backgroundImage: `url("${m.photoUrl.replace("w=480", "w=120")}")` } : undefined}>
                            {m.photoUrl ? "" : initials(m.name).slice(0, 1)}
                          </i>
                        ))}
                      </span>
                      <span className={s.pt}>
                        {p.title}
                        <small>
                          {p.count} {plural(p.count, "Viber", "Vibers")}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className={s.try} role="group" aria-label="Try one of these thoughts">
          {TRY.map((x) => (
            <button key={x} type="button" className={s.tr} onClick={() => typeText(x)}>
              {x}
            </button>
          ))}
        </div>
      </div>

      <ul className={s.formation} aria-label={`${formedIds.length} Vibers who share your thought`}>
        {formedIds.map((id) => {
          const m = matches.find((x) => x.viber.id === id);
          if (!m) return null;
          return (
            <li key={id}>
              <button
                type="button"
                className={s.fc}
                style={{ visibility: "hidden" }}
                data-liked={liked.has(id)}
                ref={(el) => {
                  if (el) cardRefs.current.set(id, el);
                  else cardRefs.current.delete(id);
                }}
                aria-label={`${m.viber.name}, ${m.viber.role}.${m.shared.length ? " Shares " + m.shared.join(", ") + "." : ""} Open profile.`}
                onClick={(e) => openPeek(id, e.currentTarget)}
              >
                <span className={s.lab}>
                  <b>{m.viber.name}</b>
                  <i>{m.shared.join(" · ")}</i>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {tip && (
        <div className={s.tip} role="tooltip" style={{ left: Math.max(120, Math.min(size.W - 120, tip.x)), top: tip.y - 60 }}>
          {tip.it.kind === "person" ? (
            <>
              <b>{tip.it.e.title}</b>
              {byId.get(tip.it.e.uid)?.role} · {areas[byId.get(tip.it.e.uid)?.area ?? "old_manali"].label}
              <br />
              <span>Click to look closer</span>
            </>
          ) : tip.it.kind === "tag" ? (
            <>
              <b>#{tip.it.e.label}</b>
              <span>Click to add it to your thought</span>
            </>
          ) : null}
        </div>
      )}

      {listOpen && (
        <section className={s.listview} aria-label="Discover as a list">
          {matches.length && searching ? (
            <>
              <h2>Vibers who share your thought</h2>
              <p style={{ color: "var(--muted)", margin: 0 }}>Best first. Tap someone to see why they&apos;re here.</p>
              <h3>
                {matches.length} {plural(matches.length, "Viber", "Vibers")}
              </h3>
              <PeopleList people={matches.map((m) => ({ v: m.viber, sub: m.shared.join(" · ") || m.viber.role }))} onOpen={(id, el) => openPeek(id, el)} />
            </>
          ) : (
            <>
              <h2>Vibers around Manali</h2>
              <p style={{ color: "var(--muted)", margin: 0 }}>Everyone the sphere shows, as a plain list.</p>
              <h3>{universe?.vibers.length ?? 0} Vibers</h3>
              <PeopleList people={(universe?.vibers ?? []).map((v) => ({ v, sub: `${v.role} · ${areas[v.area].label}` }))} onOpen={(id, el) => openPeek(id, el)} />
            </>
          )}
        </section>
      )}

      {peekViber && (
        <ProfilePanel
          viber={peekViber}
          match={peekMatch}
          liked={liked.has(peekViber.id)}
          saved={saved.has(peekViber.id)}
          onClose={closePeek}
          onLike={() => like(peekViber)}
          onPass={() => pass(peekViber)}
          onSave={() => save(peekViber)}
          onAddInterest={(id) => {
            closePeek();
            edit((x) => corrections.add(x, id));
            toast(`Added ${hashtag(interestById[id].label)}.`);
          }}
        />
      )}

      {infoOpen && <AboutDialog onClose={() => setInfoOpen(false)} />}

      <div className={s.toasts} role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className={s.toast}>
            {x.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function PeopleList({ people, onOpen }: { people: { v: Viber; sub: string }[]; onOpen: (id: string, el: HTMLElement) => void }) {
  return (
    <ul className={s.lv}>
      {people.map(({ v, sub }) => (
        <li key={v.id}>
          <button type="button" onClick={(e) => onOpen(v.id, e.currentTarget)}>
            <span className={s.lvph} aria-hidden="true" style={v.photoUrl ? { backgroundImage: `url("${v.photoUrl.replace("w=480", "w=160")}")` } : undefined}>
              {v.photoUrl ? "" : initials(v.name)}
            </span>
            <span>
              <b>{v.name}</b>
              <small>{sub}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => back?.focus();
  }, []);
  return (
    <div className={s.dlgWrap} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={s.dlg} role="dialog" aria-modal="true" aria-labelledby="about-title" tabIndex={-1}>
        <h2 id="about-title">About Discover</h2>
        <p>Type what you&apos;re in the mood for. Discover reads it as interests, an area and what you hope to do, then brings forward Vibers who share it.</p>
        <ul>
          <li>Tags are suggestions. Remove one, or add one, and the results follow you.</li>
          <li>Order comes from shared interests (rarer ones count more), what you&apos;re both looking for, and your area. No compatibility percentages.</li>
          <li>Only Vibers who can see each other appear. Blocks work both ways, and women-only discovery is respected.</li>
          <li>Only a general area is ever shown, never a live location.</li>
          <li>Like someone and, if they like you back, you can send a connection request. Then you can chat.</li>
        </ul>
        <p>
          <b>This is a design preview.</b> Everyone here is a fictional sample Viber; the photos are free-licence stand-ins.
        </p>
        <div className={s.row}>
          <button type="button" className={s.btn} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
