"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NBA_LINKS = [
  { href: "/", label: "Tonight" },
  { href: "/teams", label: "Teams" },
  { href: "/refs", label: "Refs" },
];

const NHL_LINKS = [
  { href: "/nhl", label: "Tonight" },
  { href: "/nhl/teams", label: "Teams" },
  { href: "/nhl/refs", label: "Refs" },
];

export function SiteNav() {
  const pathname = usePathname();
  const isNhl = pathname.startsWith("/nhl");
  const links = isNhl ? NHL_LINKS : NBA_LINKS;
  const homeHref = isNhl ? "/nhl" : "/";

  return (
    <div className="flex items-center gap-3">
      <div className="flex rounded-lg border border-border bg-zinc-50 p-0.5 text-xs font-medium">
        <Link
          href="/"
          className={`rounded-md px-2.5 py-1 transition ${
            !isNhl
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          NBA
        </Link>
        <Link
          href="/nhl"
          className={`rounded-md px-2.5 py-1 transition ${
            isNhl
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          NHL
        </Link>
      </div>
      <nav className="flex gap-0.5">
        {links.map((link) => {
          const active =
            link.href === homeHref
              ? pathname === homeHref
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3.5 py-2 text-sm transition ${
                active
                  ? "bg-zinc-900 font-medium text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
