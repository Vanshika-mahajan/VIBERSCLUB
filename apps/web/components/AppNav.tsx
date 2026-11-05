"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PillNav from "@/components/reactbits/PillNav";
import { PostButton } from "@/components/PostButton";
import { TopBar } from "@/components/TopBar";
import { activeNav, isFullScreen, navItems } from "@/lib/nav";

const items = navItems.map((i) => ({ label: i.label, href: i.href }));

/**
 * The pill bar at the foot of every screen (Home, Discover, Events, Explore) with the + for posting,
 * and your initial at the top right (with the bell on Home).
 */
export function AppNav() {
  const pathname = usePathname();
  if (isFullScreen(pathname)) return null;
  return (
    <>
      <TopBar />
      <div className="vc-pillbar">
        <PillNav
          items={items}
          linkComponent={Link}
          activeHref={activeNav(pathname) ?? ""}
          theme="winewood"
          layout="joined"
          indicator="pill"
          hoverEffect="glide"
          placement="bottom"
          intro={false}
          ariaLabel="Main"
        />
        <PostButton />
      </div>
    </>
  );
}
