"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { useDemo } from "@/lib/demo/store";
import { isActive, menuItems } from "@/lib/nav";
import { playSound, useSound } from "@/lib/sound";

/** The round avatar at the top right: opens a small menu with my profile, chats and events. */
export function ProfileMenu() {
  const pathname = usePathname();
  const me = useDemo((s) => s.me);
  const connections = useDemo((s) => s.connections);
  const requests = Object.values(connections).filter((c) => c === "incoming").length;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const sound = useSound();

  // a link in the menu changes the page: close it on the way
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && root.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="vc-profile">
      <button
        ref={button}
        type="button"
        className="vc-profile__button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Your profile and chats${requests ? `, ${requests} new ${requests === 1 ? "request" : "requests"}` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={me.name} size={40} />
        {requests > 0 && (
          <span className="vc-profile__badge" aria-hidden="true">
            {requests}
          </span>
        )}
      </button>
      {open && (
        <div id={menuId} className="vc-profile__menu">
          <div className="vc-profile__head">
            <Avatar name={me.name} size={44} />
            <div className="min-w-0">
              <p className="truncate font-extrabold text-ink">{me.name}</p>
              <p className="truncate text-xs text-muted">{me.status === "local" ? "Local in Manali" : "Visiting Manali"}</p>
            </div>
          </div>
          <ul>
            {menuItems.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="vc-profile__row" aria-current={isActive(pathname, i.href) ? "page" : undefined}>
                  {i.label}
                  {i.href === "/chats" && requests > 0 && (
                    <span className="vc-profile__count" aria-label={`${requests} new ${requests === 1 ? "request" : "requests"}`}>
                      {requests}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <div className="vc-profile__sound">
            <button
              type="button"
              role="switch"
              aria-checked={sound.enabled}
              className="vc-profile__row w-full"
              data-sound="none"
              onClick={() => {
                sound.setEnabled(!sound.enabled);
                if (!sound.enabled) playSound("select");
              }}
            >
              Sounds
              <span className="vc-profile__switch" aria-hidden="true" />
            </button>
            {sound.enabled && (
              <label className="vc-profile__volume">
                <span className="sr-only">Sound volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(sound.volume * 100)}
                  onChange={(e) => sound.setVolume(Number(e.target.value) / 100)}
                  onPointerUp={() => playSound("tap")}
                  onKeyUp={() => playSound("tap")}
                />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
