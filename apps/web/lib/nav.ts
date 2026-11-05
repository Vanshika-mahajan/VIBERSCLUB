/** the bottom pill bar: the four main places */
export const navItems = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/explore", label: "Explore" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** the main item a page belongs to, for the pill bar */
export function activeNav(pathname: string): string | undefined {
  return navItems.find((i) => isActive(pathname, i.href))?.href;
}

/** full screen pages draw their own menus */
export const isFullScreen = (pathname: string) => pathname === "/" || pathname === "/universe";
