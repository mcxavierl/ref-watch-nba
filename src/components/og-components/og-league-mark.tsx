import { leagueLogoSrc } from "@/lib/league-logo-src";
import type { LeagueId } from "@/lib/leagues";
import { absoluteUrl } from "@/lib/site";

type OgLeagueMarkProps = {
  leagueId: LeagueId;
  size?: number;
  className?: string;
};

/** Static league mark for OG rendering (dark theme). */
export function OgLeagueMark({
  leagueId,
  size = 18,
  className = "",
}: OgLeagueMarkProps) {
  const src = leagueLogoSrc(leagueId, "dark");
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-slate-300 ${className}`.trim()}
        style={{ width: size + 8, height: size + 8 }}
      >
        {leagueId.toUpperCase()}
      </div>
    );
  }

  const resolvedSrc = src.startsWith("http") ? src : absoluteUrl(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt=""
      width={size}
      height={size}
      className={`block object-contain ${className}`.trim()}
    />
  );
}
