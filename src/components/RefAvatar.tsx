"use client";

import { useState } from "react";
import { refInitials, refPhotoUrl } from "@/lib/ref-photos";

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
} as const;

const sizePixels = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 96,
} as const;

const textSizeClasses = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base",
} as const;

type RefAvatarSport = "nba" | "nhl" | "wnba" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

function sportRingClass(sport?: RefAvatarSport): string {
  if (sport === "nfl") {
    return "ring-[color:color-mix(in_srgb,var(--nfl-green)_45%,transparent)]";
  }
  if (sport === "nhl") {
    return "ring-[color:color-mix(in_srgb,var(--nhl-blue)_45%,transparent)]";
  }
  if (sport === "epl" || sport === "laliga") {
    return "ring-[color:color-mix(in_srgb,#3d195b_45%,transparent)]";
  }
  if (sport === "cbb" || sport === "cfb") {
    return "ring-[color:color-mix(in_srgb,var(--cbb-gold)_45%,transparent)]";
  }
  if (sport === "wnba") {
    return "ring-[color:color-mix(in_srgb,var(--wnba-orange)_45%,transparent)]";
  }
  return "ring-zinc-200/80";
}

function sportInitialsClass(sport?: RefAvatarSport): string {
  if (sport === "nfl") return "ref-initials-badge--nfl";
  if (sport === "nhl") return "ref-initials-badge--nhl";
  if (sport === "epl" || sport === "laliga") return "ref-initials-badge--soccer";
  if (sport === "cbb" || sport === "cfb") return "ref-initials-badge--college";
  if (sport === "wnba") return "ref-initials-badge--wnba";
  return "ref-initials-badge--nba";
}

function RefInitialsBadge({
  name,
  size,
  sport,
  className = "",
  decorative = true,
}: {
  name: string;
  size: keyof typeof sizeClasses;
  sport?: RefAvatarSport;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <span
      className={`ref-initials-badge ${sportInitialsClass(sport)} ${sizeClasses[size]} ${textSizeClasses[size]} ${className}`}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${name} avatar`}
      role={decorative ? undefined : "img"}
    >
      <span className={`ref-initials-badge__ring ring-2 ${sportRingClass(sport)}`} aria-hidden />
      <span className="ref-initials-badge__label">{refInitials(name)}</span>
    </span>
  );
}

export function RefAvatar({
  name,
  slug,
  sport,
  size = "md",
  className = "",
  decorative = true,
}: {
  name: string;
  slug: string;
  sport: RefAvatarSport;
  size?: keyof typeof sizeClasses;
  className?: string;
  /** When true (default), name is exposed by an adjacent label/link — image is decorative. */
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  const photoSrc = refPhotoUrl(
    slug,
    sport,
    size === "lg" || size === "xl" ? "headshot" : "thumb",
  );

  if (failed || !photoSrc) {
    return (
      <RefInitialsBadge
        name={name}
        size={size}
        sport={sport}
        className={className}
        decorative={decorative}
      />
    );
  }

  const ringClass =
    sport === "nfl"
      ? "ring-2 ring-[color:color-mix(in_srgb,var(--nfl-green)_40%,transparent)]"
      : sport === "nhl"
        ? "ring-2 ring-[color:color-mix(in_srgb,var(--nhl-blue)_40%,transparent)]"
        : sport === "epl" || sport === "laliga"
          ? "ring-2 ring-[color:color-mix(in_srgb,#3d195b_40%,transparent)]"
          : sport === "cbb" || sport === "cfb"
            ? "ring-2 ring-[color:color-mix(in_srgb,var(--cbb-gold)_40%,transparent)]"
            : sport === "wnba"
              ? "ring-2 ring-[color:color-mix(in_srgb,var(--wnba-orange)_40%,transparent)]"
              : "ring-1 ring-zinc-200/80";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- onError fallback to initials badge
    <img
      src={photoSrc}
      alt={decorative ? "" : `Photo of ${name}`}
      width={sizePixels[size]}
      height={sizePixels[size]}
      aria-hidden={decorative || undefined}
      className={`shrink-0 rounded-full object-cover object-top ${ringClass} ${sizeClasses[size]} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
