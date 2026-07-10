"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ConfidenceTier } from "@/lib/user-language";
import { confidenceTierClass } from "@/lib/user-language";

export function ConfidenceStrengthIndicator({
  tier,
  href,
  className = "",
}: {
  tier: ConfidenceTier;
  href?: string;
  className?: string;
}) {
  const router = useRouter();
  const classes = `${confidenceTierClass(tier)} ${className}`.trim();
  const label = `${tier} confidence`;

  if (!href) {
    return (
      <span className={classes} aria-label={label}>
        {tier}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${classes} confidence-tier-badge-link`}
      aria-label={`View ${label} findings`}
      onClick={(event) => {
        // Inside <summary>, preventDefault stops the accordion toggle.
        event.preventDefault();
        event.stopPropagation();
        router.push(href);
      }}
    >
      {tier}
    </Link>
  );
}
