"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "@/lib/nav";

/** Bottom bar on phones, sidebar from the md breakpoint up. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-background pb-[env(safe-area-inset-bottom)] md:static md:w-56 md:shrink-0 md:border-t-0 md:border-r md:pb-0 dark:border-zinc-800"
    >
      <p className="hidden px-6 py-6 text-lg font-semibold md:block">Vibers Club</p>
      <ul className="flex justify-around md:flex-col md:gap-1 md:px-3">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block px-3 py-3 text-sm md:rounded-lg ${
                  active ? "font-semibold text-foreground md:bg-zinc-100 md:dark:bg-zinc-900" : "text-zinc-500"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
