import { Radar } from "lucide-react";
import { GsniCard } from "@/components/GsniCard";
import { GsniSampleCount } from "@/components/GsniSampleCount";
import { GsniSharedTrack } from "@/components/GsniSharedTrack";

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
          <p className="gsni-soft-lock-card-headline">Building Game-State Index profile</p>
          <p className="gsni-soft-lock-card-copy">
            <GsniSampleCount>{collected}</GsniSampleCount> / {gate} high-leverage
            minutes collected.
          </p>
        </div>
      </div>
      <GsniSharedTrack mode="progress" value={minutes} gate={gate} className="mt-3" />
    </GsniCard>
  );
}
