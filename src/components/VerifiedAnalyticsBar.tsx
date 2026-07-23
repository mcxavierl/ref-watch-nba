import { SiteNavLink } from "@/components/SiteNavLink";
import { SITE_TAGLINE } from "@/lib/site";

/** Slim branded bar above the site footer on every page. */
export function VerifiedAnalyticsBar() {
  return (
    <div className="verified-analytics-bar">
      <div className="verified-analytics-bar-inner">
        <SiteNavLink href="/methodology" className="verified-analytics-bar-link">
          <span className="verified-analytics-bar-brand">RefWatch</span>
          <span className="verified-analytics-bar-sep" aria-hidden>
            |
          </span>
          <span className="verified-analytics-bar-tagline">{SITE_TAGLINE}</span>
        </SiteNavLink>
      </div>
    </div>
  );
}
