"use client";

import { useId, useState } from "react";
import { refPhotoUrl } from "@/lib/ref-photos";

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
} as const;

function RefStripesBadge({
  name,
  size,
  className = "",
}: {
  name: string;
  size: keyof typeof sizeClasses;
  className?: string;
}) {
  const patternId = `ref-stripes-${useId().replace(/:/g, "")}`;

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200/80 ${sizeClasses[size]} ${className}`}
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
            patternTransform="rotate(45 0 0)"
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
  sport: "nba" | "nhl";
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const photoSrc =
    sport === "nhl" ? refPhotoUrl(slug, sport, size === "lg" ? "headshot" : "thumb") : null;

  if (failed || !photoSrc) {
    return <RefStripesBadge name={name} size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- onError fallback to striped ref badge
    <img
      src={photoSrc}
      alt=""
      aria-hidden
      className={`shrink-0 rounded-full object-cover ring-1 ring-zinc-200/80 ${sizeClasses[size]} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
