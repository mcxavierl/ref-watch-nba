"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GamblingDisclaimer } from "@/components/GamblingDisclaimer";
import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";
import { footerConfigForLeague } from "@/lib/footer-config";
import {
  footerLeagueForPath,
  type FooterLeague,
} from "@/lib/footer-league";

export type { FooterLeague };

export function SiteFooter({ league }: { league?: FooterLeague }) {
  const pathname = usePathname() ?? "/";
  const activeLeague = league ?? footerLeagueForPath(pathname);
  const config = footerConfigForLeague(activeLeague);

  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
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
          <div>
            <p className="site-footer-heading site-footer-heading--explore">Explore</p>
            <ul className="site-footer-explore space-y-1.5">
              {config.exploreLinks.map((item) => {
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
                    <Link href={item.href} className={className}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="site-footer-heading">Disclaimer</p>
            <p className="site-footer-body">
              Patterns from past games, not predictions. For research and
              entertainment only. Not betting advice.
            </p>
            {config.notifyLeague ? (
              <p className="mt-3 site-footer-body">
                <SeasonNotifyCta league={config.notifyLeague} variant="link" />
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <GamblingDisclaimer />
    </footer>
  );
}
