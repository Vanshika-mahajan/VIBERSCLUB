"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { contents, isActive, ROMAN } from "@/lib/nav";
import s from "./contents.module.css";

const reduced = () =>
  typeof window !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The contents of the club, after Shopify Editions. On Home, at the very top, they sit centred in a
 * thin frame over the opening: the title, a standfirst and the list I to VII. The first scroll pours
 * them into the corner (title top left, list bottom left, at the same size) and they stay there on
 * every page. Back at the very top of Home they fly back into the frame. On a phone the docked list is
 * a strip along the foot of the screen.
 *
 * Over the dark opening and chapter photographs the type is ivory; over the paper it is espresso,
 * worked out line by line from the regions marked data-tone="dark".
 */
export function Contents() {
  const pathname = usePathname();
  const home = pathname === "/home";
  const [dock, setDock] = useState(!home);
  // the chapter you are reading: an anchor in the contents, while it is on this page
  const [at, setAt] = useState<string | null>(null);
  const docked = useRef(dock);
  const root = useRef<HTMLDivElement>(null);
  const movedAt = useRef(0);
  // rects of the moving pieces, measured just before the switch, for the FLIP below
  const first = useRef<DOMRect[] | null>(null);

  const pieces = () => {
    const el = root.current;
    if (!el) return [];
    return [
      el.querySelector(`.${s.title}`),
      ...el.querySelectorAll(`.${s.t}, .${s.n}`),
    ].filter(Boolean) as HTMLElement[];
  };

  // each line takes ivory over the dark regions and espresso over the paper
  const tone = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const dark = [
      ...document.querySelectorAll<HTMLElement>("[data-tone='dark']"),
    ]
      .map((d) => d.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    const onDark = (r: DOMRect) => {
      const y = r.top + r.height / 2;
      return dark.some(
        (d) =>
          y > d.top && y < d.bottom && r.left < d.right && r.right > d.left,
      );
    };
    el.querySelectorAll<HTMLElement>(
      `.${s.title}, .${s.list} li, .${s.credit}`,
    ).forEach((x) =>
      x.classList.toggle(s.paper, !onDark(x.getBoundingClientRect())),
    );
    // the top line (wordmark, + Post) follows the same rule
    document
      .querySelectorAll<HTMLElement>(".vc-word, .vc-plus, .vc-band")
      .forEach((x) =>
        x.classList.toggle("is-paper", !onDark(x.getBoundingClientRect())),
      );
  }, []);

  const move = useCallback(
    (toDock: boolean) => {
      if (docked.current === toDock) return;
      docked.current = toDock;
      movedAt.current = performance.now();
      const ps = pieces();
      first.current = ps.map((p) => p.getBoundingClientRect());
      ps.forEach((p) => p.getAnimations().forEach((a) => a.cancel()));
      setDock(toDock);
    },

    [],
  );

  /* FLIP, piece by piece, as Shopify does it: the title travels as one block; every word travels on
     its own, each line a beat after the one above, and the numerals follow a beat behind their words,
     so the list pours into the corner like a staircase (and pours back up into the frame). */
  useLayoutEffect(() => {
    tone();
    const was = first.current;
    first.current = null;
    if (!was || reduced()) return;
    pieces().forEach((p, k) => {
      const b = p.getBoundingClientRect(),
        a = was[k];
      if (!a || !b.width) return;
      const line = k === 0 ? 0 : Math.floor((k - 1) / 2),
        numeral = k > 0 && (k - 1) % 2 === 1;
      p.style.transformOrigin = "0 0";
      p.animate(
        [
          {
            transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`,
          },
          { transform: "none" },
        ],
        {
          duration: k === 0 ? 560 : 520,
          delay: k === 0 ? 0 : 40 + line * 26 + (numeral ? 60 : 0),
          easing: "cubic-bezier(.62,0,.22,1)",
          fill: "backwards",
        },
      );
    });
    const t1 = setTimeout(tone, 60),
      t2 = setTimeout(tone, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [dock, tone]);

  // a new page: Home starts centred when you are at its very top; every other page starts docked
  useEffect(() => {
    first.current = null;

    docked.current = !home || window.scrollY > 4;
    setDock(docked.current);
    const t = setTimeout(tone, 120);
    return () => clearTimeout(t);
  }, [home, tone]);

  useEffect(() => {
    let raf = 0;
    let back: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (window.scrollY > 4) move(true);
      // back at the very top of Home: the contents fly back into the frame (once the move out has
      // finished; if you come back sooner, a moment later)
      else if (home && window.scrollY === 0) {
        const wait = 700 - (performance.now() - movedAt.current);
        clearTimeout(back);
        if (wait <= 0) move(false);
        else
          back = setTimeout(() => {
            if (window.scrollY === 0) move(false);
          }, wait);
      }
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          tone();
          locate();
        });
    };
    // the last chapter whose top has passed 40% of the screen; on Home the opening is chapter I
    const locate = () => {
      let found: string | null = null;
      for (const c of contents) {
        const [path, id] = c.href.split("#");
        if (!id || path !== pathname) continue;
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= innerHeight * 0.4)
          found = c.href;
      }
      if (!found && home && window.scrollY > 4) found = contents[0].href;
      setAt(found);
    };
    locate();
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) move(true);
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("resize", tone);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("wheel", onWheel);
      removeEventListener("resize", tone);
      cancelAnimationFrame(raf);
      clearTimeout(back);
    };
  }, [home, move, tone, pathname]);

  // a chapter on this page: glide down to it (the list moves aside first)
  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    const [path, id] = href.split("#");
    if (!id || path !== pathname) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    move(true);
    target.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  // the chapter you are reading on Home, or the page of its own you are on (/discover, ...)
  const current = (c: (typeof contents)[number]) => {
    if ("page" in c && isActive(pathname, c.page)) return "page";
    return c.href === at ? "location" : undefined;
  };

  return (
    <div
      ref={root}
      className={`vc-contents ${s.toc} ${dock ? s.dock : ""} ${home ? "" : s.inner}`}
    >
      <div className={s.frame} aria-hidden="true" />
      {home ? (
        <h1 className={s.title}>
          Spaces for curious people<span className={s.dot}>.</span>
        </h1>
      ) : (
        <p className={s.title} aria-hidden="true">
          Spaces for curious people<span className={s.dot}>.</span>
        </p>
      )}
      <p className={s.stand}>
        Travellers and locals in Manali, finding the ones who share their vibe.
      </p>
      <nav aria-label="Main" className={s.nav}>
        <ol className={s.list}>
          {contents.map((c, i) => (
            <li key={c.href}>
              <Link
                href={c.href}
                onClick={(e) => go(e, c.href)}
                aria-current={current(c)}
              >
                <span className={s.t}>{c.label}</span>
                <i className={s.n} aria-hidden="true">
                  {ROMAN[i]}
                </i>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <p className={s.credit} aria-hidden="true">
        © Vibers Club · Issue 01
        <br />
        Manali, Himachal Pradesh
      </p>
    </div>
  );
}
