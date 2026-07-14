import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { WC_RESEARCH_PRINCIPLES } from "@/lib/world-cup-research";

export function WorldCupMethodologyCard() {
  return (
    <section
      className="data-card wc-methodology-card"
      aria-labelledby="wc-methodology-heading"
    >
      <div className="wc-methodology-card-header">
        <span className="wc-methodology-card-icon" aria-hidden>
          <BarChart3 />
        </span>
        <h2 className="wc-methodology-card-title" id="wc-methodology-heading">
          Trust &amp; Methodology
        </h2>
      </div>

      <p className="wc-methodology-card-lead">
        This research identifies <strong>statistical tendencies</strong> in officiating
        patterns. It does <strong>not</strong> assign bias, intent, or favoritism to
        individual referees or confederations.
      </p>

      <ul className="wc-methodology-card-list">
        {WC_RESEARCH_PRINCIPLES.map((principle) => (
          <li key={principle}>{principle}</li>
        ))}
      </ul>

      <p className="wc-methodology-card-note">
        Origin variance scores measure geopolitical distance between a referee&apos;s birth
        nation and participating team nations. Signals require minimum sample gates and
        confidence tiers before surfacing.
      </p>

      <Link href="/methodology" className="wc-methodology-card-cta">
        Read full methodology
      </Link>
    </section>
  );
}
