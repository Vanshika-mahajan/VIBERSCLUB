/** the four main places */
export const navItems = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/explore", label: "Explore" },
] as const;

/**
 * The contents, set like a magazine's: the four chapters of Home, then the other pages, in one flat
 * list numbered I to VII. A chapter is an anchor on Home; a page is its own route.
 */
export const contents = [
  { label: "Your vibe", href: "/home#your-vibe" },
  { label: "Vibers like you", href: "/home#vibers-like-you" },
  { label: "This week", href: "/home#this-week" },
  { label: "Day plans", href: "/home#day-plans" },
  { label: "Discover", href: "/discover" },
  { label: "Events", href: "/events" },
  { label: "Explore", href: "/explore" },
] as const;

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** the main item a page belongs to */
export function activeNav(pathname: string): string | undefined {
  return navItems.find((i) => isActive(pathname, i.href))?.href;
}

/** full screen pages draw their own menus */
export const isFullScreen = (pathname: string) => pathname === "/" || pathname === "/universe";
