"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { A11ySettingsPanel } from "@/components/A11ySettingsPanel";
import { Whistle } from "@/components/icons/Whistle";
import {
  isOverviewPath,
  leagueFromPathname,
  SITE_HOME_PATH,
} from "@/lib/leagues";
import { LEAGUE_MANIFEST } from "@/lib/league-manifest";
import { LeagueNav } from "./SiteNav";

function isLeagueHubPath(pathname: string): boolean {
  const path = pathname.split("?")[0];
  for (const id of Object.keys(LEAGUE_MANIFEST)) {
    const prefix = LEAGUE_MANIFEST[id as keyof typeof LEAGUE_MANIFEST].pathPrefix;
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

export function SiteHeader() {
  const pathname = usePathname();
  const resolvedPath = pathname ?? "/";
  const leagueId = leagueFromPathname(resolvedPath);
  const homeHref = SITE_HOME_PATH;
  const [scrolled, setScrolled] = useState(false);
  const showCompare =
    isOverviewPath(resolvedPath) || isLeagueHubPath(resolvedPath);

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 12);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <div
      className={`site-chrome${scrolled ? " site-chrome--scrolled" : ""}`}
      data-league={leagueId}
    >
      <header className="site-header">
        <div className="site-header-inner">
          <Link href={homeHref} className="site-header-brand group" aria-label="Ref Watch home">
            <span className="site-header-mark" aria-hidden>
              <span className="site-header-mark-ring" />
              <span className="site-header-mark-icon">
                <Whistle className="size-4" strokeWidth={2.35} />
              </span>
            </span>
            <span className="site-header-wordmark">
              <span className="site-header-name">REF WATCH</span>
            </span>
          </Link>

          <div className="site-header-league">
            <LeagueNav />
          </div>

          <div className="site-header-util">
            {showCompare ? (
              <Link href="/compare" className="site-header-compare-link">
                Compare
              </Link>
            ) : null}
            <A11ySettingsPanel />
          </div>
        </div>
      </header>
    </div>
  );
}
