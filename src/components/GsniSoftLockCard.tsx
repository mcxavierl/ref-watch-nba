import { Radar } from "lucide-react";
import { GsniCard } from "@/components/GsniCard";
import { GsniSampleCount } from "@/components/GsniSampleCount";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";
import { GSNI_INSUFFICIENT_DATA_LABEL } from "@/lib/gsni-display";

export function GsniSoftLockCard({
  minutes,
  gate,
}: {
  minutes: number;
  gate: number;
}) {
  const collected = Math.round(minutes * 10) / 10;

  return (
    <GsniCard variant="soft-lock">
      <div className="gsni-soft-lock-card-head">
        <Radar
          className="gsni-soft-lock-card-icon h-5 w-5 shrink-0 text-indigo-400"
          strokeWidth={2.1}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="gsni-soft-lock-card-headline">{GSNI_INSUFFICIENT_DATA_LABEL}</p>
          <p className="gsni-soft-lock-card-copy">
            <GsniSampleCount>{collected}</GsniSampleCount> / {gate} high-leverage
            minutes collected before we publish an index score.
          </p>
        </div>
      </div>
      <GsniSharedTrack mode="progress" value={minutes} gate={gate} className="mt-3" />
    </GsniCard>
  );
}
