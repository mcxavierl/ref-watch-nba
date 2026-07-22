import { SiteNavLink as Link } from "@/components/SiteNavLink";

export function TrustCharterSummary() {
  return (
    <p className="trust-charter-compact">
      Historical tendencies only, with sample gates, confidence tiers, and{" "}
      <Link href="/methodology" className="trust-charter-link">
        transparent methodology
      </Link>
      . Not betting advice.
    </p>
  );
}
