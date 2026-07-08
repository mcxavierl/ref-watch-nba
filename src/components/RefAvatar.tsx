"use client";

import { useId, useState } from "react";
import { refPhotoUrl } from "@/lib/ref-photos";

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
} as const;

function RefStripesBadge({
  name,
  size,
  sport,
  className = "",
}: {
  name: string;
  size: keyof typeof sizeClasses;
  sport?: "nhl" | "nfl" | "epl";
  className?: string;
}) {
  const patternId = `ref-stripes-${useId().replace(/:/g, "")}`;
  const ringClass =
    sport === "nfl"
      ? "ring-[color:color-mix(in_srgb,var(--nfl-green)_45%,transparent)]"
      : sport === "nhl"
        ? "ring-[color:color-mix(in_srgb,var(--nhl-blue)_45%,transparent)]"
        : sport === "epl"
          ? "ring-[color:color-mix(in_srgb,#3d195b_45%,transparent)]"
          : "ring-zinc-200/80";

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ring-2 ${ringClass} ${sizeClasses[size]} ${className}`}
      aria-label={`${name} avatar`}
      role="img"
    >
      <svg
        viewBox="0 0 32 32"
        className="h-full w-full"
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id={patternId}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <rect width="4" height="8" fill="#171717" />
            <rect x="4" width="4" height="8" fill="#fafafa" />
          </pattern>
        </defs>
        <rect width="32" height="32" fill={`url(#${patternId})`} />
      </svg>
    </span>
  );
}

export function RefAvatar({
  name,
  slug,
  sport,
  size = "md",
  className = "",
}: {
  name: string;
  slug: string;
  sport: "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb";
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (sport === "nba" || sport === "cbb" || sport === "cfb") return null;

  const photoSrc =
    sport === "nhl" || sport === "nfl" || sport === "epl"
      ? refPhotoUrl(slug, sport, size === "lg" || size === "xl" ? "headshot" : "thumb")
      : null;

  if (failed || !photoSrc) {
    return (
      <RefStripesBadge
        name={name}
        size={size}
        sport={sport === "nfl" || sport === "nhl" || sport === "epl" ? sport : undefined}
        className={className}
      />
    );
  }

  const ringClass =
    sport === "nfl"
      ? "ring-2 ring-[color:color-mix(in_srgb,var(--nfl-green)_40%,transparent)]"
      : sport === "nhl"
        ? "ring-2 ring-[color:color-mix(in_srgb,var(--nhl-blue)_40%,transparent)]"
        : sport === "epl"
          ? "ring-2 ring-[color:color-mix(in_srgb,#3d195b_40%,transparent)]"
          : "ring-1 ring-zinc-200/80";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- onError fallback to striped ref badge
    <img
      src={photoSrc}
      alt=""
      aria-hidden
      className={`shrink-0 rounded-full object-cover object-top ${ringClass} ${sizeClasses[size]} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
