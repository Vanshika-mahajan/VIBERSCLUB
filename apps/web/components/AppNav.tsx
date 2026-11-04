"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PillNav from "@/components/reactbits/PillNav";
import { ProfileMenu } from "@/components/ProfileMenu";
import { activeNav, isFullScreen, navItems } from "@/lib/nav";

const items = navItems.map((i) => ({ label: i.label, href: i.href }));

/**
 * The pill bar at the foot of every screen (Home, Discover, Explore) and the profile menu at the top
 * right. The current page lights its pill; pages outside the three leave all three unlit.
 */
export function AppNav() {
  const pathname = usePathname();
  if (isFullScreen(pathname)) return null;
  return (
    <>
      <ProfileMenu />
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
      </div>
    </>
  );
}
