"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createSampleAdapter, type DiscoveryAdapter } from "@/features/discover/adapter";
import s from "@/features/discover/discover.module.css";
import { Icon } from "@/features/discover/icons";
import { corrections, emptyCorrections, hashtag } from "@/features/discover/interpret";
import { ProfilePanel } from "@/features/discover/ProfilePanel";
import { Sphere, initials, type SphereItem } from "@/features/discover/sphere";
import type { Corrections, DiscoveryResult, Viber, WorldCard } from "@/features/discover/types";
import { useCalm } from "@/features/discover/useCalm";
import { likedMe } from "@/lib/demo/data";
import { actions, useDemo } from "@/lib/demo/store";
import { areas, hueOf, interestById } from "@/lib/taxonomy";
import { RoomView } from "./RoomView";
import { roomFor, sampleRooms, type Room } from "./sample-rooms";
import { sampleScreens, type Screen } from "./sample-screens";
import { ago, orbitsFor, screenUid } from "./tiers";
import u from "./universe.module.css";

const sampleAdapter = createSampleAdapter();

const TRY = ["I want to explore Manali with people who love photography", "Trek Hampta this weekend", "Live music, no clubbing", "Workation buddies with good wifi"];
// category hues keep their old ids; on screen they read forest, terracotta and gold
const HUE_COLOR = { blue: "#2F6B5C", violet: "#D97757", cyan: "#D9A548" } as const;
const MENU = [
  { href: "/today", label: "Today" },
  { href: "/discover", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/chats", label: "Chats" },
  { href: "/explore", label: "Explore" },
  { href: "/profile", label: "Profile" },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const first = (v: Viber) => v.name.split(" ")[0];
const meta = (sc: Screen) => `${plural(sc.replies, sc.kind === "photo" ? "comment" : "reply", sc.kind === "photo" ? "comments" : "replies")} · ${ago(sc.minutesAgo)}`;

type Toast = { id: number; text: string };

/**
 * The home page: one full-screen universe. People, threads and photos orbit a human sphere in three
 * bands. Each word of a thought re-ranks everything, and the closest matches spiral into the inner
 * orbit. Stepping in pulls them into the core, which opens into a collective room (sample, demo only).
 * Everything on the canvas is also reachable as a plain list.
 */
export function UniverseScreen({ adapter = sampleAdapter, screens = sampleScreens }: { adapter?: DiscoveryAdapter; screens?: Screen[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sphereRef = useRef<Sphere | null>(null);

  const [universe, setUniverse] = useState<{ vibers: Viber[]; world: WorldCard[] } | null>(null);
  const [sphereReady, setSphereReady] = useState(0);
  const [text, setText] = useState("");
  const [corr, setCorr] = useState<Corrections>(emptyCorrections);
  const [latest, setResult] = useState<DiscoveryResult | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calm, setCalm] = useCalm();
  const [paused, setPaused] = useState(false);
  const [tip, setTip] = useState<{ it: SphereItem; x: number; y: number } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const likedList = useDemo((x) => x.liked);
  const savedList = useDemo((x) => x.saved);
  const passedList = useDemo((x) => x.passed);
  const blocked = useDemo((x) => x.blocked);
  const connections = useDemo((x) => x.connections);
  const liked = useMemo(() => new Set(likedList), [likedList]);
  const saved = useMemo(() => new Set(savedList), [savedList]);
  const passed = useMemo(() => new Set(passedList), [passedList]);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [phase, setPhase] = useState<"universe" | "pulling" | "room">("universe");
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text: msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  useEffect(() => {
    adapter.universe().then(setUniverse);
  }, [adapter, blocked]);

  const byId = useMemo(() => new Map((universe?.vibers ?? []).map((v) => [v.id, v])), [universe]);

  /* ---------- the universe (created when the people arrive, disposed on leave) ---------- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !universe) return;
    const sp = new Sphere(cv, {
      tiers: true,
      reduced: calmRef.current,
      onPick: (it) => pickRef.current(it),
      onHover: (it, p) => setTip(it && p && it.kind !== "world" ? { it, x: p.x, y: p.y } : null),
    });
    const names = new Map(universe.vibers.map((v) => [v.id, v.name]));
    const counts = new Map<string, number>();
    universe.vibers.forEach((v) => v.interests.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1)));
    sp.load(
      universe.vibers.map((v) => ({ uid: v.id, title: v.name, photoUrl: v.photoUrl, pos: v.photoPosition })),
      universe.world.map((w) => ({ uid: "w:" + w.id, kind: w.kind, photoUrl: w.photoUrl })),
      [...counts].filter(([, n]) => n >= 2).map(([id]) => ({ id, label: hashtag(interestById[id].label).slice(1), col: HUE_COLOR[hueOf(id)] })),
      screens.map((x) => ({ uid: screenUid(x.id), kind: x.kind, title: x.title, snippet: x.snippet, author: names.get(x.authorId) ?? "A Viber", meta: meta(x), photoUrl: x.photoUrl })),
    );
    sp.start();
    sphereRef.current = sp;
    setSphereReady((n) => n + 1);
    return () => {
      sp.dispose();
      sphereRef.current = null;
    };
  }, [universe, screens]);

  const calmRef = useRef(calm);
  useEffect(() => {
    calmRef.current = calm;
    sphereRef.current?.setReduced(calm);
  }, [calm]);
  useEffect(() => sphereRef.current?.setPaused(paused), [paused, sphereReady]);

  /* ---------- every word re-reads the thought ---------- */
  const active = !!text.trim() || corr.added.length > 0;
  useEffect(() => {
    if (!active) return;
    let live = true;
    const id = setTimeout(() => {
      adapter.query(text, corr, 40).then((r) => live && setResult(r));
    }, 80);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [active, text, corr, adapter]);

  const result = active ? latest : null;
  const searching = !!result && (result.thought.interests.length > 0 || result.thought.area !== null);
  const orbits = useMemo(() => (result && searching ? orbitsFor(result, screens, passed) : null), [result, searching, screens, passed]);

  useEffect(() => {
    sphereRef.current?.setRelevance(orbits ? orbits.relevance : null);
  }, [orbits, sphereReady]);

  /* ---------- into the core, and the room it opens ---------- */
  const fitRoom = useMemo(() => (orbits && result ? roomFor(result.thought) : null), [orbits, result]);

  function enter() {
    if (!fitRoom || !orbits || phase !== "universe") return;
    inputRef.current?.blur();
    setListOpen(false);
    const uids = [...orbits.inner.people.map((m) => m.viber.id), ...orbits.inner.screens.map((x) => screenUid(x.screen.id))];
    const secs = sphereRef.current?.pull(uids) ?? 0;
    setPhase("pulling");
    later(() => {
      setRoom(fitRoom);
      setPhase("room");
      sphereRef.current?.setBackdrop(true);
    }, secs * 1000 + 120);
  }
  const leave = useCallback(() => {
    setLeaving(true);
    later(
      () => {
        setLeaving(false);
        setRoom(null);
        setPhase("universe");
        sphereRef.current?.setBackdrop(false);
        sphereRef.current?.unpull();
        inputRef.current?.focus({ preventScroll: true });
      },
      calm ? 0 : 420,
    );
  }, [calm]);
  function switchRoom(r: Room) {
    setLeaving(true);
    later(
      () => {
        setLeaving(false);
        setRoom(r);
      },
      calm ? 0 : 380,
    );
  }

  const roomPeople = useMemo(() => {
    if (!room) return [];
    const ids = [...(orbits?.inner.people.map((m) => m.viber.id) ?? []), ...room.memberIds];
    return [...new Set(ids)].filter((id) => !passed.has(id)).flatMap((id) => byId.get(id) ?? []);
  }, [room, orbits, passed, byId]);
  const roomThreads = useMemo(() => {
    if (!room) return [];
    const overlap = (x: Screen) => x.interests.filter((i) => room.interests.includes(i)).length;
    return screens
      .filter((x) => overlap(x) > 0)
      .sort((a, b) => overlap(b) - overlap(a) || a.minutesAgo - b.minutesAgo)
      .slice(0, 6);
  }, [room, screens]);

  const edit = (fn: (c: Corrections) => Corrections) => setCorr(fn);
  const reset = () => {
    setText("");
    setCorr(emptyCorrections());
  };

  /* ---------- picking on the canvas ---------- */
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

  /* ---------- profile panel ---------- */
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
      if (peekId) closePeek();
      else if (room) leave();
      else if (menuOpen) setMenuOpen(false);
      else if (listOpen) setListOpen(false);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [peekId, menuOpen, listOpen, closePeek, room, leave]);

  const peekViber = peekId ? byId.get(peekId) : undefined;
  const peekMatch = peekId ? result?.matches.find((m) => m.viber.id === peekId) : undefined;

  async function like(v: Viber) {
    if (liked.has(v.id)) return;
    const { mutual } = await adapter.swipe(v.id, "like");
    toast(mutual ? `You and ${first(v)} like each other. You can send a connection request.` : `You liked ${first(v)}. If they like you back, you can connect.`);
  }
  function connect(v: Viber) {
    actions.requestConnection(v.id);
    toast(likedMe.includes(v.id) ? `${first(v)} accepted. Say hello in Chats.` : `Request sent to ${first(v)}.`);
  }
  function pass(v: Viber) {
    void adapter.swipe(v.id, "pass");
    closePeek();
    toast(`Passed. ${first(v)} drifts back to the outer orbit.`);
  }
  function save(v: Viber) {
    const on = !saved.has(v.id);
    void adapter.swipe(v.id, on ? "save" : "unsave");
    toast(on ? `Saved ${first(v)} for later.` : `Removed ${first(v)} from saved.`);
  }
  function toggleCalm() {
    const v = !calm;
    setCalm(v);
    toast(v ? "Calm mode on: the universe holds still." : "Calm mode off.");
  }

  /* ---------- the status line ---------- */
  function line() {
    if (!active) return <>Type a thought, word by word, and watch the right people drift toward the centre.</>;
    if (!result) return <>Reading your thought…</>;
    if (!searching) return <>Keep going. Name something you love, like photography, treks or cafés.</>;
    if (!orbits) return null;
    const inner = orbits.inner.people.length + orbits.inner.screens.length;
    const middle = orbits.middle.people.length + orbits.middle.screens.length;
    if (!inner && !middle) return <>No one here shares all of that yet. Remove a tag to widen it.</>;
    return (
      <>
        <b>
          {plural(orbits.inner.people.length, "Viber", "Vibers")} and {plural(orbits.inner.screens.length, "conversation", "conversations")}
        </b>{" "}
        in the inner orbit{middle ? `, ${middle} more on the middle orbit` : ""}.{" "}
        {fitRoom && (
          <>
            <button type="button" onClick={enter}>
              Step into {fitRoom.title}
            </button>
            {" · "}
          </>
        )}
        <button type="button" onClick={() => setListOpen(true)}>
          See as a list
        </button>
      </>
    );
  }

  const t = result?.thought;
  const hasQ = !!text || corr.added.length > 0;

  return (
    <div className={`${s.root} ${u.root}`} data-hasq={hasQ} data-list={listOpen} data-calm={calm} data-searching={!!orbits} data-phase={phase}>
      <div className={s.stage}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="A universe of sample Vibers, discussion threads and photos orbiting a sphere of people. Everything it shows is also in the list view."
        />
      </div>

      <header className={s.top}>
        <Link href="/" className={s.brand} onClick={reset} aria-label="Vibers Club home">
          <span className={s.mark} aria-hidden="true">
            <i />
            <i />
          </span>
          <span className={s.brandWord}>
            <b>Vibers</b> Club
          </span>
        </Link>
        <span className={s.spacer} />
        <div className={s.ctl} role="group" aria-label="View controls">
          <button type="button" className={s.cb} aria-pressed={listOpen} aria-label="List view" title="List view" onClick={() => setListOpen((v) => !v)}>
            <Icon name="list" />
          </button>
          <button type="button" className={s.cb} aria-pressed={calm} aria-label="Calm mode" title="Calm mode" onClick={toggleCalm}>
            <Icon name="calm" />
          </button>
          <button type="button" className={s.cb} aria-pressed={paused} aria-label={paused ? "Play the universe" : "Pause the universe"} title={paused ? "Play" : "Pause"} onClick={() => setPaused((p) => !p)}>
            <Icon name={paused ? "play" : "pause"} />
          </button>
          <div className={u.menuWrap}>
            <button type="button" className={`${s.cb} ${u.menuBtn}`} aria-expanded={menuOpen} aria-controls="universe-menu" onClick={() => setMenuOpen((v) => !v)}>
              Menu
            </button>
            {menuOpen && (
              <nav id="universe-menu" className={u.menu} aria-label="Main">
                <ul>
                  {MENU.map((m) => (
                    <li key={m.href}>
                      <Link href={m.href}>{m.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
      </header>

      <div className={s.hero}>
        <div className={`${s.intro} ${u.intro}`}>
          <h1>
            Say a thought.
            <br />
            Your people <span className={s.you}>come closer.</span>
          </h1>
        </div>
        <div className={`${s.ask} ${u.ask}`}>
          <form role="search" autoComplete="off" onSubmit={(e) => (e.preventDefault(), fitRoom ? enter() : inputRef.current?.blur())}>
            <div className={s.bar}>
              <span className={s.orbit} aria-hidden="true" />
              <svg className={s.ret} viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="14" className={s.r1} />
                <circle cx="20" cy="20" r="7" className={s.r2} />
                <path d="M20 3v6M20 31v6M3 20h6M31 20h6" className={s.tk} />
              </svg>
              <label className={s.sr} htmlFor="universe-thought">
                What&apos;s on your mind?
              </label>
              <input
                ref={inputRef}
                id="universe-thought"
                className={s.input}
                type="text"
                enterKeyHint="search"
                maxLength={280}
                placeholder="What's on your mind?"
                aria-describedby="universe-line"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {hasQ && (
                <button type="button" className={s.clr} aria-label="Clear what I typed" onClick={() => (reset(), inputRef.current?.focus())}>
                  <Icon name="x" />
                </button>
              )}
              <button type="submit" className={s.go} aria-label={fitRoom ? `Step into ${fitRoom.title}` : "Done typing"}>
                <Icon name="arrow" />
              </button>
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
                </ul>
              )}
              <p className={s.line} id="universe-line" role="status" aria-live="polite">
                {line()}
              </p>
            </div>
          </form>
        </div>
        <div className={`${s.try} ${u.try}`} role="group" aria-label="Try one of these thoughts">
          {TRY.map((x) => (
            <button key={x} type="button" className={s.tr} onClick={() => setText(x)}>
              {x}
            </button>
          ))}
        </div>
      </div>

      {tip && (
        <div className={s.tip} role="tooltip" style={{ left: tip.x, top: tip.y - 60 }}>
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
          ) : tip.it.kind === "screen" ? (
            <>
              <b>{tip.it.e.title}</b>
              {tip.it.e.author} · {tip.it.e.meta}
            </>
          ) : null}
        </div>
      )}

      {listOpen && (
        <section className={s.listview} aria-label="The universe as a list">
          {orbits ? (
            <>
              <h2>Closest to your thought</h2>
              <p style={{ color: "var(--muted)", margin: 0 }}>The inner orbit first, then the middle orbit. All sample content.</p>
              <OrbitList title="Inner orbit" people={orbits.inner.people.map((m) => ({ v: m.viber, sub: m.shared.join(" · ") }))} screens={orbits.inner.screens.map((x) => x.screen)} byId={byId} onOpen={openPeek} />
              <OrbitList title="Middle orbit" people={orbits.middle.people.map((m) => ({ v: m.viber, sub: m.shared.join(" · ") }))} screens={orbits.middle.screens.map((x) => x.screen)} byId={byId} onOpen={openPeek} />
            </>
          ) : (
            <>
              <h2>Everyone and everything orbiting Manali</h2>
              <p style={{ color: "var(--muted)", margin: 0 }}>Type a thought to bring the closest ones to the top. All sample content.</p>
              <OrbitList title="Outer orbit" people={(universe?.vibers ?? []).map((v) => ({ v, sub: `${v.role} · ${areas[v.area].label}` }))} screens={screens} byId={byId} onOpen={openPeek} />
            </>
          )}
        </section>
      )}

      {room && (
        <RoomView
          key={room.id}
          room={room}
          people={roomPeople}
          threads={roomThreads}
          otherRooms={sampleRooms.filter((r) => r.id !== room.id)}
          byId={byId}
          leaving={leaving}
          onLeave={leave}
          onSwitch={switchRoom}
          onOpenPerson={openPeek}
        />
      )}

      {peekViber && (
        <ProfilePanel
          viber={peekViber}
          match={peekMatch}
          liked={liked.has(peekViber.id)}
          saved={saved.has(peekViber.id)}
          connection={connections[peekViber.id] ?? (liked.has(peekViber.id) && likedMe.includes(peekViber.id) ? "mutual" : undefined)}
          onConnect={() => connect(peekViber)}
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

function OrbitList({
  title,
  people,
  screens,
  byId,
  onOpen,
}: {
  title: string;
  people: { v: Viber; sub: string }[];
  screens: Screen[];
  byId: Map<string, Viber>;
  onOpen: (id: string, el: HTMLElement) => void;
}) {
  if (!people.length && !screens.length) return null;
  return (
    <>
      <h3>
        {title}: {plural(people.length, "Viber", "Vibers")}, {plural(screens.length, "conversation", "conversations")}
      </h3>
      <ul className={s.lv}>
        {people.map(({ v, sub }) => (
          <li key={v.id}>
            <button type="button" onClick={(e) => onOpen(v.id, e.currentTarget)}>
              <span className={s.lvph} aria-hidden="true" style={v.photoUrl ? { backgroundImage: `url("${v.photoUrl.replace("w=480", "w=160")}")` } : undefined}>
                {v.photoUrl ? "" : initials(v.name)}
              </span>
              <span>
                <b>{v.name}</b>
                <small>{sub || v.role}</small>
              </span>
            </button>
          </li>
        ))}
        {screens.map((x) => (
          <li key={x.id} className={u.screenRow}>
            <span className={s.lvph} aria-hidden="true" style={x.photoUrl ? { backgroundImage: `url("${x.photoUrl}")` } : undefined}>
              {x.photoUrl ? "" : "#"}
            </span>
            <span>
              <b>{x.title}</b>
              <small>
                {x.kind === "photo" ? "Photo" : "Thread"} by {byId.get(x.authorId)?.name ?? "a Viber"} · {meta(x)}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
