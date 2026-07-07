import type { NhlOtRateSignal, NhlPpPremiumSignal } from "@/lib/types";
import { TermHelp } from "@/components/TermHelp";
import { ProvenanceMarker } from "@/components/ProvenanceMarker";
import { SampleGateBadge } from "@/components/SampleGateBadge";

export function NhlSlateSignalBadges({
  ppPremium,
  otSignal,
}: {
  ppPremium?: NhlPpPremiumSignal | null;
  otSignal?: NhlOtRateSignal | null;
}) {
  if (!ppPremium && !otSignal) return null;

  return (
    <div className="flex flex-wrap gap-2 border-t border-border-subtle px-4 py-3 sm:px-5">
      {ppPremium && (
        <span
          className="inline-flex max-w-full flex-col rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-800"
          title={ppPremium.summary}
        >
          <span className="flex flex-wrap items-center gap-1.5 font-medium">
            <TermHelp id="pp-premium">Power play factor</TermHelp>
            {ppPremium.provenance && (
              <>
                <ProvenanceMarker provenance={ppPremium.provenance.index} compact />
                <SampleGateBadge gate={ppPremium.provenance.sampleGate} />
              </>
            )}
          </span>
          <span className="text-xs text-zinc-600">
            Index {ppPremium.index} · {ppPremium.refMinorRate} minors/g
          </span>
        </span>
      )}
      {otSignal && (
        <span
          className="inline-flex max-w-full flex-col rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-800"
          title={otSignal.summary}
        >
          <span className="flex flex-wrap items-center gap-1.5 font-medium">
            <TermHelp id="ot-rate-badge">Overtime tendency</TermHelp>
            {otSignal.provenance && (
              <>
                <ProvenanceMarker provenance={otSignal.provenance.refereeOtRate} compact />
                <SampleGateBadge gate={otSignal.provenance.sampleGate} />
              </>
            )}
          </span>
          <span className="text-xs text-zinc-600">
            {(otSignal.refereeOtRate * 100).toFixed(1)}% OT · line{" "}
            {otSignal.homeSpread! > 0 ? "+" : ""}
            {otSignal.homeSpread}
          </span>
        </span>
      )}
    </div>
  );
}
