import Link from "next/link";
import { RefAvatar } from "@/components/RefAvatar";
import type { NflLeaderEntry } from "@/lib/nfl/analytics-leaders";

export function NflAnalyticsLeaders({ leaders }: { leaders: NflLeaderEntry[] }) {
  if (leaders.length === 0) return null;

  return (
    <section className="section-block">
      <div className="section-block-header">
        <h2 className="section-title">Official analytics leaders</h2>
        <p className="section-lead">
          ESPN-verified penalty and scoring splits, descriptive tendencies, not
          picks.
        </p>
      </div>
      <ul className="nfl-leaders-grid">
        {leaders.map((item) => (
          <li key={item.category} className="nfl-leader-card data-card">
            <p className="nfl-leader-category">{item.title}</p>
            <Link
              href={`/nfl/refs/${item.ref.slug}`}
              className="nfl-leader-profile"
            >
              <RefAvatar
                name={item.ref.name}
                slug={item.ref.slug}
                sport="nfl"
                size="lg"
              />
              <span className="nfl-leader-copy">
                <span className="nfl-leader-name">{item.ref.name}</span>
                <span className="nfl-leader-meta font-mono">
                  #{item.ref.number} · {item.ref.games} games
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
