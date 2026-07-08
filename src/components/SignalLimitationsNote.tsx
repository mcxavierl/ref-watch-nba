import { SIGNAL_LIMITATION_COPY } from "@/lib/trust-charter";

export function SignalLimitationsNote({ className = "" }: { className?: string }) {
  return (
    <p className={`signal-limitations-note ${className}`.trim()}>
      {SIGNAL_LIMITATION_COPY}
    </p>
  );
}
