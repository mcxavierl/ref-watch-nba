import type { Metadata } from "next";
import { PartnersExecutiveDeck } from "@/components/b2b/PartnersExecutiveDeck";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Enterprise partnerships",
  description:
    "Ref Watch partnership overview, referee crew intelligence, traction, and B2B integration opportunities for media and licensed partners.",
  robots: { index: false, follow: false },
  alternates: { canonical: absoluteUrl("/partners") },
};

export default function PartnersPage() {
  return (
    <div className="page-shell page-shell-partners">
      <PartnersExecutiveDeck />
    </div>
  );
}
