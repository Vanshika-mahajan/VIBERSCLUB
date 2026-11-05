/** the four main places */
export const navItems = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/explore", label: "Explore" },
] as const;

/**
 * The contents, set like a magazine's: one flat list numbered I to VII, every item a chapter of Home
 * you can scroll or glide to. Discover, Events and Explore also keep their own pages (`page`), where
 * the contents mark them as the page you are on.
 */
export const contents = [
  { label: "Your vibe", href: "/home#your-vibe" },
  { label: "Vibers like you", href: "/home#vibers-like-you" },
  { label: "This week", href: "/home#this-week" },
  { label: "Day plans", href: "/home#day-plans" },
  { label: "Discover", href: "/home#discover", page: "/discover" },
  { label: "Events", href: "/home#events", page: "/events" },
  { label: "Explore", href: "/home#explore", page: "/explore" },
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
