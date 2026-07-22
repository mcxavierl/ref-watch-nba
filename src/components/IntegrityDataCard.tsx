import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { ShieldCheck } from "lucide-react";
import { TRUST_CHARTER_PRINCIPLES } from "@/lib/trust-charter";

export function IntegrityDataCard() {
  return (
    <section className="data-card integrity-data-card" aria-labelledby="integrity-data-heading">
      <div className="integrity-data-card-header">
        <span className="integrity-data-card-icon" aria-hidden>
          <ShieldCheck />
        </span>
        <h2 className="integrity-data-card-title" id="integrity-data-heading">
          Integrity &amp; Data
        </h2>
      </div>

      <ul className="integrity-data-card-list">
        {TRUST_CHARTER_PRINCIPLES.map((principle) => (
          <li key={principle}>{principle}</li>
        ))}
      </ul>

      <p className="integrity-data-card-note">
        Every metric passes a minimum sample gate and is labeled with a confidence
        tier (Strong, Moderate, Thin) before it reaches the dataset.
      </p>

      <Link href="/methodology" className="integrity-data-card-cta">
        Read our methodology
      </Link>
    </section>
  );
}
