import Link from "next/link";
import { TRUST_CHARTER_PRINCIPLES } from "@/lib/trust-charter";

export function TrustCharterSummary({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="trust-charter-compact">
        Historical tendencies only — with sample gates, confidence tiers, and{" "}
        <Link href="/methodology" className="trust-charter-link">
          transparent methodology
        </Link>
        . Not betting advice.
      </p>
    );
  }

  return (
    <section className="trust-charter" aria-labelledby="trust-charter-title">
      <h2 id="trust-charter-title" className="trust-charter-title">
        How RefWatch works
      </h2>
      <ul className="trust-charter-list">
        {TRUST_CHARTER_PRINCIPLES.map((principle) => (
          <li key={principle}>{principle}</li>
        ))}
      </ul>
      <p className="trust-charter-foot">
        <Link href="/methodology" className="trust-charter-link">
          Read full methodology →
        </Link>
      </p>
    </section>
  );
}
