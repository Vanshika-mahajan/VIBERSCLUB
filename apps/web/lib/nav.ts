export const navItems = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/chats", label: "Chats" },
  { href: "/profile", label: "Profile" },
] as const;

/** in the sidebar only; on phones these are reached from the universe menu on Home */
export const moreItems = [
  { href: "/today", label: "Today" },
  { href: "/explore", label: "Explore" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
