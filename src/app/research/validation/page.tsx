import type { Metadata } from "next";
import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { JsonLd } from "@/components/JsonLd";
import { ValidationReportContent } from "@/components/ValidationReportContent";
import { buildPageMetadata, techArticleJsonLd } from "@/lib/seo";
import "@/components/methodology-page.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Closing-line validation",
  description:
    "Walk-forward backtest results for RefWatch signals against external closing lines. Empirical validation with honest coverage reporting.",
  path: "/research/validation",
  keywords: [
    "closing line validation",
    "walk-forward backtest",
    "officiating signal validation",
    "referee analytics research",
  ],
});

export default function ValidationPage() {
  return (
    <div className="page-shell clinical-doc-shell">
      <JsonLd
        data={techArticleJsonLd({
          headline: "Closing-line validation",
          description:
            "Walk-forward backtest results for RefWatch signals against external closing lines. Empirical validation with honest coverage reporting.",
          path: "/research/validation",
        })}
      />
      <Link href="/" className="back-link">
        ← Home
      </Link>
      <ValidationReportContent />
    </div>
  );
}
