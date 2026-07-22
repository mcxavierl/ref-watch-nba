"use client";

import { usePathname } from "next/navigation";
import { GamblingDisclaimer } from "@/components/GamblingDisclaimer";
import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";
import {
  footerConfigForLeague,
  type FooterDisclaimerLink,
  type FooterExploreLink,
} from "@/lib/footer-config";
import {
  footerLeagueForPath,
  type FooterLeague,
} from "@/lib/footer-league";

export type { FooterLeague };

function FooterLinkList({
  items,
  className,
}: {
  items: Array<FooterExploreLink | FooterDisclaimerLink>;
  className: string;
}) {
  return (
    <ul className={className}>
      {items.map((item) => {
        const className = "site-footer-link";

        if (item.external) {
          return (
            <li key={item.key}>
              <a href={item.href} className={className}>
                {item.label}
              </a>
            </li>
          );
        }

        return (
          <li key={item.key}>
            <a href={item.href} className={className}>
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function SiteFooter({ league }: { league?: FooterLeague }) {
  const pathname = usePathname() ?? "/";
  const activeLeague = league ?? footerLeagueForPath(pathname);
  const config = footerConfigForLeague(activeLeague);

  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="site-footer-grid grid gap-8 sm:grid-cols-3">
          <div className="site-footer-column">
            <p className="site-footer-heading">Data sources</p>
            <p className="site-footer-body">
              Not affiliated with {config.affiliationLabel}. {config.sourceLead}
              {config.sourceHref && config.sourceLinkText ? (
                <>
                  {" "}
                  <a
                    href={config.sourceHref}
                    className="site-footer-inline-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {config.sourceLinkText}
                  </a>
                  .
                </>
              ) : (
                "."
              )}{" "}
              Historical stats cover {config.historyRange}.
            </p>
          </div>
          <div className="site-footer-column">
            <p className="site-footer-heading site-footer-heading--explore">Explore</p>
            <FooterLinkList
              items={config.exploreLinks}
              className="site-footer-links site-footer-explore"
            />
          </div>
          <div className="site-footer-column">
            <p className="site-footer-heading">Disclaimer</p>
            <p className="site-footer-body">
              Patterns from past games, not predictions. For research and
              entertainment only. Not betting advice. ATS/O-U uses nflverse
              historical closing lines on matched games only, not live
              sportsbook prices. Treat as exploratory historical context, not
              picks.
            </p>
            <FooterLinkList
              items={config.disclaimerLinks}
              className="site-footer-links site-footer-disclaimer-links"
            />
            {config.notifyLeague ? (
              <p className="site-footer-body site-footer-notify">
                <SeasonNotifyCta league={config.notifyLeague} variant="link" />
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <GamblingDisclaimer />
      <p className="site-footer-copyright">
        © 2026 Ref Watch. All rights reserved.
      </p>
    </footer>
  );
}
