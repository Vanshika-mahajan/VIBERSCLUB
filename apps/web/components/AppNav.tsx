"use client";

import { usePathname } from "next/navigation";
import { Contents } from "@/components/contents/Contents";
import { TopBar } from "@/components/TopBar";
import { isFullScreen } from "@/lib/nav";

/**
 * The club's navigation on every screen: the contents (centred at the top of Home, then docked in the
 * corner) and the top line with the wordmark, + Post and your initial (with the bell on Home).
 */
export function AppNav() {
  const pathname = usePathname();
  if (isFullScreen(pathname)) return null;
  return (
    <>
      <TopBar />
      <Contents />
    </>
  );
}
