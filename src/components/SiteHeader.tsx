"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, UserCircle } from "lucide-react";
import { Whistle } from "@/components/icons/Whistle";
import { LeagueSwitch, SiteNav } from "./SiteNav";

// TODO: Re-enable profile + notification controls when account features ship.
const SHOW_HEADER_USER_CONTROLS = false;

export function SiteHeader() {
  const pathname = usePathname();
  const isNfl = pathname.startsWith("/nfl");
  const isNhl = pathname.startsWith("/nhl");
  const homeHref = isNfl ? "/nfl" : isNhl ? "/nhl" : "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 12);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <div className={`site-chrome${scrolled ? " site-chrome--scrolled" : ""}`}>
      <header className="site-header">
        <div className="site-header-glow" aria-hidden />
        <div className="site-header-accent" aria-hidden />

        <div className="site-header-inner">
          <div className="site-header-top">
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

            <div className="site-header-right">
              <div className="site-header-league">
                <LeagueSwitch />
              </div>

              {SHOW_HEADER_USER_CONTROLS ? (
                <div className="site-header-actions" aria-label="Account and notifications">
                  <button type="button" className="site-header-icon-btn" aria-label="Open profile">
                    <UserCircle className="size-5" strokeWidth={1.85} />
                  </button>
                  <button type="button" className="site-header-icon-btn" aria-label="Open notifications">
                    <Bell className="size-4" strokeWidth={2} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <SiteNav id="site-primary-nav" />
    </div>
  );
}
