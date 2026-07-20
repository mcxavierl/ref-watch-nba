import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import {
  ABOUT_NOT_LIST,
  ABOUT_PAGE_LEAD,
  ABOUT_PILLARS,
  REFWATCH_MISSION,
  TRUST_CHARTER_PRINCIPLES,
} from "@/lib/about-content";
import { REFWATCH_GEO_FAQ } from "@/lib/geo-faq";
import { aboutPageJsonLd, buildPageMetadata, faqPageJsonLd } from "@/lib/seo";
import "@/components/methodology-page.css";

export const metadata: Metadata = buildPageMetadata({
  title: "About RefWatch",
  description:
    "Officiating intelligence for research, media, and league-adjacent products. Radical transparency, process-driven analytics, and empirical validation.",
  path: "/about",
  keywords: [
    "officiating intelligence",
    "referee research",
    "sports analytics transparency",
    "ref watch mission",
  ],
});

export default function AboutPage() {
  return (
    <div className="page-shell clinical-doc-shell">
      <JsonLd data={[aboutPageJsonLd(), faqPageJsonLd(REFWATCH_GEO_FAQ)]} />
      <Link href="/" className="back-link">
        ← Home
      </Link>

      <section className="page-hero section-block">
        <h1 className="page-title">About RefWatch</h1>
        <p className="page-lead">{ABOUT_PAGE_LEAD}</p>
        <p className="page-lead">{REFWATCH_MISSION}</p>
      </section>

      <section className="methodology-grid clinical-doc-section" aria-labelledby="about-faq-heading">
        <h2 id="about-faq-heading" className="section-title">
          Frequently asked questions
        </h2>
        <dl className="methodology-faq">
          {REFWATCH_GEO_FAQ.map((item) => (
            <div key={item.question} className="methodology-faq-item">
              <dt className="methodology-faq-question">{item.question}</dt>
              <dd className="methodology-faq-answer">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="methodology-grid clinical-doc-section">
        {ABOUT_PILLARS.map((pillar) => (
          <article key={pillar.id} className="methodology-capsule">
            <h2 className="methodology-capsule-title">{pillar.title}</h2>
            <p className="methodology-capsule-lead">{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="methodology-capsule methodology-capsule--wide clinical-doc-section--tight">
        <h2 className="methodology-capsule-title">Trust charter</h2>
        <ul className="methodology-capsule-list">
          {TRUST_CHARTER_PRINCIPLES.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>

      <section className="methodology-capsule methodology-capsule--wide clinical-doc-section--tight">
        <h2 className="methodology-capsule-title">What RefWatch is not</h2>
        <ul className="methodology-capsule-list">
          {ABOUT_NOT_LIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="clinical-doc-footer-links">
        <Link href="/methodology" className="trust-charter-link">
          Full methodology
        </Link>
        {" · "}
        <Link href="/research/validation" className="trust-charter-link">
          Closing-line validation
        </Link>
        {" · "}
        <Link href="/research/leverage-spike-anomaly" className="trust-charter-link">
          Leverage-spike research
        </Link>
      </section>
    </div>
  );
}
