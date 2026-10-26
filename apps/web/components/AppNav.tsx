"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo } from "@/lib/demo/store";
import { isActive, moreItems, navItems } from "@/lib/nav";

function Mark() {
  return (
    <span className="relative block h-9 w-9 overflow-hidden rounded-xl border border-line bg-white shadow-soft" aria-hidden="true">
      <i className="absolute inset-[7px] rotate-[-30deg] rounded-full border-[1.5px] border-blue border-r-transparent" />
      <i className="absolute inset-[12px] rotate-[30deg] rounded-full border-[1.5px] border-cyan border-l-transparent" />
    </span>
  );
}

/** Bottom bar on phones, sidebar from the md breakpoint up. */
export function AppNav() {
  const pathname = usePathname();
  const connections = useDemo((s) => s.connections);
  const requests = Object.values(connections).filter((c) => c === "incoming").length;
  const link = (href: string, label: string, sidebarOnly = false) => {
    const active = isActive(pathname, href);
    return (
      <li key={href} className={sidebarOnly ? "hidden md:block" : ""}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`relative flex h-14 items-center px-3 text-sm md:h-auto md:rounded-xl md:px-4 md:py-3 ${
            active ? "font-extrabold text-ink md:bg-white md:shadow-card" : "font-semibold text-muted hover:text-ink"
          }`}
        >
          {label}
          {href === "/chats" && requests > 0 && (
            <span className="ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-blue px-1 text-[0.68rem] font-extrabold text-white" aria-label={`${requests} new requests`}>
              {requests}
            </span>
          )}
        </Link>
      </li>
    );
  };
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-t-0 md:border-r md:bg-pearl md:pb-0"
    >
      <Link href="/" className="hidden items-center gap-2.5 px-5 py-6 md:flex">
        <Mark />
        <span className="text-lg font-extrabold tracking-[-0.03em]">Vibers Club</span>
      </Link>
      <ul className="flex justify-around md:flex-col md:gap-1 md:px-3">
        {navItems.map((i) => link(i.href, i.label))}
        {moreItems.map((i) => link(i.href, i.label, true))}
      </ul>
    </nav>
  );
}
