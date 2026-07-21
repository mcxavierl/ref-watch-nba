"use client";

import { useState } from "react";
import { useColorMode } from "@/lib/a11y/useColorMode";
import { leagueLogoSrc } from "@/lib/league-logo-src";

const sizeClasses = {
  sm: "h-8 w-8 text-[0.55rem]",
  md: "h-10 w-10 text-[0.65rem]",
  lg: "h-14 w-14 text-[0.75rem]",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function PersonnelAvatar({
  name,
  sport,
  size = "lg",
  className = "",
}: {
  name: string;
  sport: "nba" | "nhl" | "nfl";
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const colorMode = useColorMode();
  const [nhlLogoFailed, setNhlLogoFailed] = useState(false);
  const nhlLogoSrc =
    sport === "nhl" ? leagueLogoSrc("nhl", colorMode === "light" ? "light" : "dark") : null;

  const ringClass =
    sport === "nfl"
      ? "ring-[color:color-mix(in_srgb,var(--nfl-green)_45%,transparent)]"
      : sport === "nhl"
        ? "ring-[color:color-mix(in_srgb,var(--nhl-blue)_45%,transparent)]"
        : "ring-zinc-200/80";

  return (
    <span
      className={`personnel-avatar relative inline-flex shrink-0 ${className}`.trim()}
      aria-hidden
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-surface-raised font-semibold tracking-tight text-secondary ring-2 ${ringClass} ${sizeClasses[size]}`}
      >
        {initials(name)}
      </span>
      {sport === "nhl" && nhlLogoSrc && !nhlLogoFailed ? (
        <span className="personnel-avatar-badge personnel-avatar-badge--nhl-logo" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- league mark overlay */}
          <img
            src={nhlLogoSrc}
            alt=""
            className="personnel-avatar-nhl-logo"
            onError={() => setNhlLogoFailed(true)}
          />
        </span>
      ) : null}
    </span>
  );
}
