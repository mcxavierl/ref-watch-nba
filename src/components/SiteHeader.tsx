"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { A11ySettingsPanel } from "@/components/A11ySettingsPanel";
import { LeagueSectionNav } from "@/components/LeagueSectionNav";
import { Whistle } from "@/components/icons/Whistle";
import {
  headerActiveLeague,
  SITE_HOME_PATH,
} from "@/lib/leagues";
import { LEAGUE_MANIFEST } from "@/lib/league-manifest";
import { HeaderNavLink } from "@/components/HeaderNavLink";
import { LeagueNav } from "./SiteNav";

export function SiteHeader() {
  const pathname = usePathname();
  const resolvedPath = pathname ?? "/";
  const sectionLeagueId = headerActiveLeague(resolvedPath);
  const showSectionNav = Boolean(
    sectionLeagueId && LEAGUE_MANIFEST[sectionLeagueId]?.routed,
  );
  const homeHref = SITE_HOME_PATH;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 12);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <div
      className={`site-chrome${scrolled ? " site-chrome--scrolled" : ""}`}
      data-league={sectionLeagueId ?? undefined}
    >
      <header className="site-header">
        <div className="site-header-inner">
          <HeaderNavLink href={homeHref} className="site-header-brand group" aria-label="Ref Watch home">
            <span className="site-header-mark" aria-hidden>
              <span className="site-header-mark-ring" />
              <span className="site-header-mark-icon">
                <Whistle className="size-4" strokeWidth={2.35} />
              </span>
            </span>
            <span className="site-header-wordmark">
              <span className="site-header-name">REF WATCH</span>
            </span>
          </HeaderNavLink>

          <div className="site-header-league">
            <LeagueNav />
          </div>

          <div className="site-header-util">
            <A11ySettingsPanel />
          </div>

          {showSectionNav && sectionLeagueId ? (
            <div className="site-header-nav">
              <LeagueSectionNav leagueId={sectionLeagueId} />
            </div>
          ) : null}
        </div>
      </header>
    </div>
  );
}
