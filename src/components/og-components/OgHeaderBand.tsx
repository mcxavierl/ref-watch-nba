import { WHISTLE_PATHS } from "@/lib/brand-colors";

const CHAMPAGNE_GOLD = "#C5A059";

export function OgHeaderBand({
  leagueLabel,
  subtitle,
}: {
  leagueLabel?: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col border-b border-slate-800 bg-slate-950 px-10 py-5">
      <div className="flex items-center gap-4">
        <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={CHAMPAGNE_GOLD}
            strokeWidth={2.35}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {WHISTLE_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span
              className="text-[28px] font-black tracking-[0.08em]"
              style={{ color: CHAMPAGNE_GOLD }}
            >
              REF WATCH
            </span>
            {leagueLabel ? (
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold tracking-[0.1em] text-slate-50">
                {leagueLabel}
              </span>
            ) : null}
          </div>
          <span className="text-base font-semibold" style={{ color: CHAMPAGNE_GOLD }}>
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}
