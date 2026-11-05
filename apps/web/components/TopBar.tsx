"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ui";
import { notesFor, unseen } from "@/lib/demo/notifications";
import { useDemo, type DemoState } from "@/lib/demo/store";

/**
 * Top right of every app screen: your initial, which opens your profile. On Home, a bell sits beside
 * it with your chats and notifications (matches, requests, events, group chats).
 */
export function TopBar() {
  const pathname = usePathname();
  const me = useDemo((s) => s.me);
  return (
    <div className="vc-top">
      {pathname === "/home" && <Bell />}
      <Link href="/profile" className="vc-profile__button" aria-label="Your profile" aria-current={pathname === "/profile" ? "page" : undefined}>
        <Avatar name={me.name} size={40} />
      </Link>
    </div>
  );
}

const noop = () => () => {};

function Bell() {
  // each slice as it is; the count is worked out below
  const liked = useDemo((s) => s.liked);
  const connections = useDemo((s) => s.connections);
  const rsvps = useDemo((s) => s.rsvps);
  const joinedAt = useDemo((s) => s.joinedAt);
  const hosted = useDemo((s) => s.hosted);
  const blocked = useDemo((s) => s.blocked);
  const me = useDemo((s) => s.me);
  const seen = useDemo((s) => s.seenNotes);
  // the count depends on today's date, so it is worked out in the browser only
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  const count = useMemo(
    () => (inBrowser ? unseen(notesFor({ liked, connections, rsvps, joinedAt, hosted, blocked, me } as DemoState), seen).length : 0),
    [inBrowser, liked, connections, rsvps, joinedAt, hosted, blocked, me, seen],
  );
  return (
    <Link href="/inbox" className="vc-bell" aria-label={`Chats and notifications${count ? `, ${count} new` : ""}`}>
      <HugeiconsIcon icon={Notification01Icon} size={20} strokeWidth={1.8} />
      {count > 0 && (
        <span className="vc-profile__badge" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
