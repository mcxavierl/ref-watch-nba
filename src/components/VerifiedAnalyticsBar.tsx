import Link from "next/link";

/** Slim branded bar above the site footer on every page. */
export function VerifiedAnalyticsBar() {
  return (
    <div className="verified-analytics-bar">
      <div className="verified-analytics-bar-inner">
        <Link href="/methodology" className="verified-analytics-bar-link">
          <span className="verified-analytics-bar-brand">RefWatch</span>
          <span className="verified-analytics-bar-sep" aria-hidden>
            |
          </span>
          <span className="verified-analytics-bar-tagline">Verified Analytics</span>
        </Link>
      </div>
    </div>
  );
}
