import type { Metadata } from "next";
import { NcaaIntegrityAuditDashboard } from "@/components/NcaaIntegrityAuditDashboard";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "NCAA Data Integrity Audit",
  description:
    "Live pipeline verification for NCAA Basketball and NCAA Football. Track audit coverage, integrity failures, and release gates before college analytics unlock.",
  path: "/ncaa/integrity-audit",
  keywords: [
    "NCAA referee data",
    "data integrity audit",
    "college basketball officials",
    "college football officials",
  ],
});

export default function NcaaIntegrityAuditPage() {
  return <NcaaIntegrityAuditDashboard />;
}
