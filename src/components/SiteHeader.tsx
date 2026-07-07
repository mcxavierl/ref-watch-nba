"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Whistle } from "@/components/icons/Whistle";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  const pathname = usePathname();
  const isNhl = pathname.startsWith("/nhl");
  const homeHref = isNhl ? "/nhl" : "/";

  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <Link
          href={homeHref}
          className="group flex shrink-0 items-center gap-3.5 rounded-lg outline-offset-4 transition hover:opacity-95 focus-visible:outline-2 focus-visible:outline-white/80"
        >
          <span className="site-header-brand-icon transition duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <Whistle
              className="size-5 text-raptors transition duration-300 ease-out group-hover:rotate-[-4deg] motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
              strokeWidth={2.25}
              aria-hidden
            />
          </span>
          <div className="leading-tight">
            <p className="site-header-title">REF WATCH</p>
            <p className="site-header-subtitle">
              Referee analytics for the NBA and NHL
            </p>
          </div>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
