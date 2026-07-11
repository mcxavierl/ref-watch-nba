import Link from "next/link";
import { RefAvatar } from "@/components/RefAvatar";
import type { EplLeaderEntry } from "@/lib/epl/analytics-leaders";
import { formatRefGamesMeta } from "@/lib/ref-number";

export function EplAnalyticsLeaders({
  leaders,
  hrefPrefix = "/epl",
}: {
  leaders: EplLeaderEntry[];
  hrefPrefix?: string;
}) {
  if (leaders.length === 0) return null;

  return (
    <section className="section-block">
      <div className="section-block-header">
        <h2 className="section-title">Referee analytics leaders</h2>
        <p className="section-lead">
          Goal, foul, and card splits from the historical dataset, descriptive
          tendencies, not picks.
        </p>
      </div>
      <ul className="nfl-leaders-grid">
        {leaders.map((item) => (
          <li key={item.category} className="nfl-leader-card data-card">
            <p className="nfl-leader-category">{item.title}</p>
            <Link
              href={`${hrefPrefix}/refs/${item.ref.slug}`}
              className="nfl-leader-profile"
            >
              <RefAvatar
                name={item.ref.name}
                slug={item.ref.slug}
                sport={hrefPrefix === "/laliga" ? "laliga" : "epl"}
                size="lg"
              />
              <span className="nfl-leader-copy">
                <span className="nfl-leader-name">{item.ref.name}</span>
                <span className="nfl-leader-meta font-mono">
                  {formatRefGamesMeta(item.ref.number, item.ref.games, "matches")}
                </span>
              </span>
            </Link>
            <p className="nfl-leader-value">{item.value}</p>
            <p className="nfl-leader-detail">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
