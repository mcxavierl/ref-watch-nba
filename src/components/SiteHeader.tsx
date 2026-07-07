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
      <div className="site-header-inner">
        <Link
          href={homeHref}
          className="site-header-brand group"
        >
          <span className="site-header-brand-icon transition duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <Whistle
              className="size-5 text-raptors transition duration-300 ease-out group-hover:rotate-[-4deg] motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
              strokeWidth={2.25}
              aria-hidden
            />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="site-header-title">REF WATCH</p>
            <p className="site-header-subtitle">
              Ref crew analytics before the game
            </p>
            <p className="site-header-proof">
              Free signals · sample-gated · no picks
            </p>
          </div>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
