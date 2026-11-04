export const navItems = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/chats", label: "Chats" },
  { href: "/profile", label: "Profile" },
] as const;

/** in the sidebar only; on phones the club home has the same tabs */
export const moreItems = [
  { href: "/today", label: "Today" },
  { href: "/explore", label: "Explore" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
