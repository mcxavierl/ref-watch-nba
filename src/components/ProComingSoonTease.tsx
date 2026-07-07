import { proWaitlistMailto } from "@/lib/notify";

export function ProComingSoonTease({
  league,
  compact = false,
}: {
  league?: "NBA" | "NHL";
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="text-sm leading-relaxed text-zinc-600">
        <span className="font-semibold text-zinc-800">Ref Watch Pro</span>{" "}
        (coming soon) — automated slate alerts, line-move tracking, and deeper
        crew reunion stats.{" "}
        <a
          href={proWaitlistMailto(league)}
          className="font-medium text-zinc-800 underline-offset-2 hover:text-raptors hover:underline"
        >
          Join the waitlist
        </a>
        .
      </p>
    );
  }

  return (
    <div className="pro-tease panel-inset mt-8 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900">Ref Watch Pro — coming soon</p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
            Slate alerts before tip-off, line-move context, and reunion-level
            crew stats — built on the same sample gates you see today. No paid
            tier yet; join the waitlist for early access.
          </p>
          <ul className="pro-tease-features mt-3 space-y-1.5 text-sm text-zinc-600">
            <li>Email when tonight&apos;s biggest edges post</li>
            <li>Line-move vs crew benchmark context</li>
            <li>Exact crew reunion history across seasons</li>
          </ul>
        </div>
        <div className="pro-tease-preview shrink-0" aria-hidden>
          <div className="pro-tease-blur rounded-md border border-border bg-white px-4 py-3">
            <p className="text-xs font-semibold text-zinc-400">Pro preview</p>
            <p className="mt-2 font-mono text-sm tabular-nums text-zinc-300">
              +4.2 vs book · reunion n=12
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-zinc-300">
              Line moved 1.5 since open
            </p>
          </div>
        </div>
      </div>
      <a
        href={proWaitlistMailto(league)}
        className="btn-secondary mt-4 inline-flex"
      >
        Join Pro waitlist — free
      </a>
    </div>
  );
}
