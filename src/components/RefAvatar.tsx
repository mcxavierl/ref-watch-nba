"use client";

import { useState } from "react";
import { refInitials, refPhotoUrl } from "@/lib/ref-photos";

const sizeClasses = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-sm",
} as const;

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
  const initials = refInitials(name);

  if (failed || !photoSrc) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-semibold text-zinc-600 ring-1 ring-zinc-200/80 ${sizeClasses[size]} ${className}`}
        aria-label={`${name} avatar`}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- onError fallback to initials badge
    <img
      src={photoSrc}
      alt=""
      aria-hidden
      className={`shrink-0 rounded-full object-cover ring-1 ring-zinc-200/80 ${sizeClasses[size]} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
