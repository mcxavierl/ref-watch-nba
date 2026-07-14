"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KpiDataPill } from "@/components/ui/KpiDataPill";
import { WC_RESEARCH_HUB } from "@/lib/world-cup-research";

export function WorldCupResearchHubCard() {
  return (
    <article
      className="overview-research-hub-card data-card"
      aria-labelledby="wc-research-hub-heading"
    >
      <div className="overview-research-hub-card-accent" aria-hidden />

      <header className="overview-research-hub-card-head">
        <div className="overview-research-hub-card-brand">
          <span className="overview-research-hub-card-logo-wrap">
            <Image
              src={WC_RESEARCH_HUB.logoSrc}
              alt={WC_RESEARCH_HUB.logoAlt}
              width={52}
              height={42}
              className="overview-research-hub-card-logo"
            />
          </span>
          <div>
            <p className="overview-research-hub-card-kicker">{WC_RESEARCH_HUB.kicker}</p>
            <h2
              className="overview-research-hub-card-title"
              id="wc-research-hub-heading"
            >
              {WC_RESEARCH_HUB.title}
            </h2>
          </div>
        </div>
        <span className="overview-research-hub-card-badge">Research</span>
      </header>

      <KpiDataPill
        variant="block"
        value="Origin variance"
        tone="neutral"
        label="Officiating geopolitical distance metric"
        className="overview-research-hub-card-hero"
      />

      <p className="overview-research-hub-card-story">{WC_RESEARCH_HUB.story}</p>

      <dl className="overview-research-hub-card-stats">
        <div>
          <dt>Scope</dt>
          <dd>Ref nation × team nation</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd>Confederation distance</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Exploratory</dd>
        </div>
      </dl>

      <footer className="overview-research-hub-card-footer">
        <Link
          href={WC_RESEARCH_HUB.href}
          className="overview-research-hub-card-cta"
        >
          Open research hub
          <ArrowRight aria-hidden />
        </Link>
        <Link href="/methodology" className="overview-research-hub-card-link">
          Methodology
        </Link>
      </footer>
    </article>
  );
}
